import db from '../db';
import { config } from '../config';
import { calculateCharges, ChargeBreakdown, ProductType } from '../charges';
import { getMarketSessionStatus } from '../market-hours';
import { applySlippage, roundRupee, toPaise, fromPaise } from '../money';
import { newId } from '../ids';
import { recordLedgerEntry } from '../ledger';
import {
  OrderRequest,
  OrderPreviewResult,
  PositionRecord,
  TradeRecord,
  PortfolioSummary,
  OrderStatus,
  OrderSide,
  OrderType,
} from './types';

export function previewOrder(request: OrderRequest): OrderPreviewResult {
  const { symbol, side, orderType, quantity, price, productType = 'CNC' } = request;
  const inst = db.prepare('SELECT * FROM instruments WHERE symbol = ?').get(symbol.toUpperCase()) as any;
  if (!inst) {
    throw new Error(`Instrument ${symbol} not found.`);
  }

  const effectivePrice = orderType === 'MARKET' ? (request.marketPrice ?? inst.current_price) : (price || request.marketPrice || inst.current_price);
  const charges = calculateCharges({
    side,
    productType,
    quantity,
    price: effectivePrice,
  });

  const turnover = charges.turnover;
  const marginMultiplier = productType === 'MIS' ? config.misMarginMultiplier : 1;
  const marginRequired = roundRupee(turnover / marginMultiplier);

  const user = db.prepare('SELECT virtual_cash, blocked_margin FROM users WHERE id = ?').get(request.userId) as any;
  const availableCash = user ? Math.max(0, user.virtual_cash - (user.blocked_margin || 0)) : 1000000;

  const totalRequired = side === 'BUY' ? roundRupee(marginRequired + charges.totalCharges) : 0;
  const hasSufficientFunds = side === 'SELL' || availableCash >= totalRequired;

  let warning: string | null = null;
  const prevClose = inst.previous_close || effectivePrice;
  const upperCircuit = roundRupee(prevClose * 1.20);
  const lowerCircuit = roundRupee(prevClose * 0.80);

  if (effectivePrice > upperCircuit || effectivePrice < lowerCircuit) {
    warning = `Warning: Price ₹${effectivePrice} is outside standard circuit limit bands (₹${lowerCircuit} - ₹${upperCircuit}).`;
  }

  const status = getMarketSessionStatus();
  if (!status.isOpen) {
    warning = (warning ? `${warning} ` : '') + 'Market is currently closed. Order will be queued as After-Market Order (AMO).';
  }

  return {
    symbol: inst.symbol,
    side,
    orderType,
    productType,
    quantity,
    price: effectivePrice,
    turnover,
    marginRequired,
    availableCash,
    hasSufficientFunds,
    charges,
    netEstimatedTotal: charges.netAmount,
    warning,
  };
}

export function executePaperOrder(request: OrderRequest) {
  const {
    userId,
    symbol,
    side,
    orderType,
    quantity,
    price,
    triggerPrice,
    productType = 'CNC',
    idempotencyKey,
  } = request;

  if (quantity <= 0 || !Number.isInteger(quantity)) {
    throw new Error('Quantity must be a positive integer.');
  }

  // Idempotency check: if key already processed, return existing order
  if (idempotencyKey) {
    const existingOrder = db.prepare('SELECT * FROM orders WHERE idempotency_key = ?').get(idempotencyKey) as any;
    if (existingOrder) {
      return {
        success: existingOrder.status === 'EXECUTED' || existingOrder.status === 'PENDING' || existingOrder.status === 'AMO',
        status: existingOrder.status,
        orderId: existingOrder.id,
        executedPrice: existingOrder.executed_price,
        message: `Idempotent request: Order ${existingOrder.id} already exists (${existingOrder.status})`,
      };
    }
  }

  const inst = db.prepare('SELECT * FROM instruments WHERE symbol = ?').get(symbol.toUpperCase()) as any;
  if (!inst) {
    throw new Error(`Instrument ${symbol} not found.`);
  }

  const user = db.prepare('SELECT id, virtual_cash, blocked_margin FROM users WHERE id = ?').get(userId) as any;
  if (!user) {
    throw new Error('User not found.');
  }

  const marketStatus = getMarketSessionStatus();
  const isMarketClosed = !marketStatus.isOpen;
  const ltp = request.marketPrice ?? inst.current_price;

  // Calculate execution price with slippage for MARKET orders
  let executionPrice = ltp;
  if (orderType === 'MARKET') {
    executionPrice = applySlippage(ltp, side, config.slippageBps);
  } else if (price) {
    executionPrice = price;
  }

  const charges = calculateCharges({
    side,
    productType,
    quantity,
    price: executionPrice,
  });

  const availableCash = roundRupee(user.virtual_cash - (user.blocked_margin || 0));
  const orderId = newId('ord');

  // Determine immediate fill or pending
  let status: OrderStatus = 'EXECUTED';
  let rejectionReason: string | null = null;
  let isAmo = 0;

  if (isMarketClosed) {
    status = 'AMO';
    isAmo = 1;
  } else if (orderType === 'LIMIT' && price) {
    if (side === 'BUY' && ltp > price) {
      status = 'PENDING';
    } else if (side === 'SELL' && ltp < price) {
      status = 'PENDING';
    }
  } else if (orderType === 'SL' || orderType === 'SL-M') {
    status = 'PENDING';
  }

  // Pre-trade checks
  if (side === 'SELL' && productType === 'CNC') {
    const pos = db.prepare('SELECT quantity FROM positions WHERE user_id = ? AND symbol = ? AND product_type = ?').get(userId, inst.symbol, 'CNC') as any;
    const ownedQty = pos ? pos.quantity : 0;
    if (ownedQty < quantity) {
      status = 'REJECTED';
      rejectionReason = `Insufficient holdings for delivery sale. Owned: ${ownedQty}, requested: ${quantity}. Short selling not permitted on CNC.`;
    }
  }

  if (side === 'BUY' && status !== 'REJECTED') {
    const marginMultiplier = productType === 'MIS' ? config.misMarginMultiplier : 1;
    const requiredMargin = roundRupee(charges.turnover / marginMultiplier + charges.totalCharges);
    if (availableCash < requiredMargin) {
      status = 'REJECTED';
      rejectionReason = `Insufficient margin/cash. Required: ₹${requiredMargin.toLocaleString('en-IN')}, Available: ₹${availableCash.toLocaleString('en-IN')}.`;
    }
  }

  // Execute in SQLite ACID transaction with row-level integrity
  const executeTx = db.transaction(() => {
    // 1. If rejected, record rejected order
    if (status === 'REJECTED') {
      db.prepare(`
        INSERT INTO orders (id, user_id, symbol, side, order_type, product_type, quantity, price, status, rejection_reason, idempotency_key, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'REJECTED', ?, ?, CURRENT_TIMESTAMP)
      `).run(orderId, userId, inst.symbol, side, orderType, productType, quantity, price || ltp, rejectionReason, idempotencyKey || null);

      return {
        success: false,
        status: 'REJECTED',
        orderId,
        message: rejectionReason || 'Order rejected.',
      };
    }

    // 2. If PENDING or AMO, block margin and record order
    if (status === 'PENDING' || status === 'AMO') {
      if (side === 'BUY') {
        const marginMultiplier = productType === 'MIS' ? config.misMarginMultiplier : 1;
        const blockedAmount = roundRupee(charges.turnover / marginMultiplier + charges.totalCharges);
        db.prepare('UPDATE users SET blocked_margin = blocked_margin + ? WHERE id = ?').run(blockedAmount, userId);
      }

      db.prepare(`
        INSERT INTO orders (
          id, user_id, symbol, side, order_type, product_type, quantity, price,
          trigger_price, status, amo, idempotency_key, charges_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        orderId,
        userId,
        inst.symbol,
        side,
        orderType,
        productType,
        quantity,
        price || ltp,
        triggerPrice || null,
        status,
        isAmo,
        idempotencyKey || null,
        JSON.stringify(charges)
      );

      return {
        success: true,
        status,
        orderId,
        message: isAmo ? 'After-Market Order (AMO) placed successfully. Queued for market opening.' : 'Order queued as PENDING.',
      };
    }

    // 3. Status is EXECUTED
    const tradeId = newId('trd');

    if (side === 'BUY') {
      // Deduct net amount (turnover + charges)
      const totalDeduction = charges.netAmount;
      db.prepare('UPDATE users SET virtual_cash = virtual_cash - ? WHERE id = ?').run(totalDeduction, userId);

      // Record double-entry ledger
      recordLedgerEntry({
        userId,
        direction: 'DEBIT',
        accountKind: 'CASH',
        amountPaise: toPaise(totalDeduction),
        refType: 'TRADE_BUY',
        refId: tradeId,
        memo: `Bought ${quantity} ${inst.symbol} @ ₹${executionPrice} (${productType})`,
      });

      // Update positions
      const existingPos = db.prepare('SELECT * FROM positions WHERE user_id = ? AND symbol = ? AND product_type = ?').get(userId, inst.symbol, productType) as any;
      if (existingPos) {
        const newQty = existingPos.quantity + quantity;
        const newAvg = roundRupee(((existingPos.quantity * existingPos.average_price) + (quantity * executionPrice)) / newQty);
        db.prepare(`
          UPDATE positions 
          SET quantity = ?, average_price = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(newQty, newAvg, existingPos.id);
      } else {
        const posId = newId('pos');
        db.prepare(`
          INSERT INTO positions (id, user_id, symbol, product_type, quantity, average_price, realized_pnl, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 0.0, CURRENT_TIMESTAMP)
        `).run(posId, userId, inst.symbol, productType, quantity, executionPrice);
      }
    } else if (side === 'SELL') {
      // Add net proceeds (turnover - charges)
      const netProceeds = charges.netAmount;
      db.prepare('UPDATE users SET virtual_cash = virtual_cash + ? WHERE id = ?').run(netProceeds, userId);

      // Record double-entry ledger
      recordLedgerEntry({
        userId,
        direction: 'CREDIT',
        accountKind: 'CASH',
        amountPaise: toPaise(netProceeds),
        refType: 'TRADE_SELL',
        refId: tradeId,
        memo: `Sold ${quantity} ${inst.symbol} @ ₹${executionPrice} (${productType})`,
      });

      // Update position and realized P&L
      const existingPos = db.prepare('SELECT * FROM positions WHERE user_id = ? AND symbol = ? AND product_type = ?').get(userId, inst.symbol, productType) as any;
      if (existingPos) {
        const tradeRealizedPnl = roundRupee((executionPrice - existingPos.average_price) * quantity);
        const remainingQty = existingPos.quantity - quantity;
        const newTotalRealized = roundRupee((existingPos.realized_pnl || 0) + tradeRealizedPnl);

        if (remainingQty <= 0) {
          db.prepare('DELETE FROM positions WHERE id = ?').run(existingPos.id);
        } else {
          db.prepare(`
            UPDATE positions 
            SET quantity = ?, realized_pnl = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(remainingQty, newTotalRealized, existingPos.id);
        }
      }
    }

    // Insert Order first to satisfy foreign key in trades table
    db.prepare(`
      INSERT INTO orders (
        id, user_id, symbol, side, order_type, product_type, quantity, filled_qty, price,
        executed_price, status, idempotency_key, charges_json, created_at, executed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'EXECUTED', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(
      orderId,
      userId,
      inst.symbol,
      side,
      orderType,
      productType,
      quantity,
      quantity,
      price || executionPrice,
      executionPrice,
      idempotencyKey || null,
      JSON.stringify(charges)
    );

    // Insert Trade
    db.prepare(`
      INSERT INTO trades (id, order_id, user_id, symbol, side, quantity, price, charges_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(tradeId, orderId, userId, inst.symbol, side, quantity, executionPrice, JSON.stringify(charges));

    // Insert into transactions audit table
    db.prepare(`
      INSERT INTO transactions (id, user_id, order_id, symbol, type, amount, quantity, price, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(newId('tx'), userId, orderId, inst.symbol, side, charges.turnover, quantity, executionPrice);

    return {
      success: true,
      status: 'EXECUTED',
      orderId,
      tradeId,
      executedPrice: executionPrice,
      charges,
      message: `Paper Trade executed: ${side} ${quantity} ${inst.symbol} @ ₹${executionPrice.toFixed(2)} (${productType})`,
    };
  });

  return executeTx();
}

export function cancelOrder(orderId: string, userId: string) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, userId) as any;
  if (!order) {
    throw new Error('Order not found.');
  }

  if (order.status !== 'PENDING' && order.status !== 'AMO') {
    throw new Error(`Cannot cancel order in status: ${order.status}`);
  }

  const cancelTx = db.transaction(() => {
    // Unblock margin if BUY
    if (order.side === 'BUY') {
      let blockedMargin = 0;
      if (order.charges_json) {
        try {
          const ch = JSON.parse(order.charges_json);
          const marginMult = order.product_type === 'MIS' ? config.misMarginMultiplier : 1;
          blockedMargin = roundRupee(ch.turnover / marginMult + ch.totalCharges);
        } catch {}
      } else {
        const marginMult = order.product_type === 'MIS' ? config.misMarginMultiplier : 1;
        blockedMargin = roundRupee((order.quantity * order.price) / marginMult);
      }

      if (blockedMargin > 0) {
        db.prepare('UPDATE users SET blocked_margin = MAX(0, blocked_margin - ?) WHERE id = ?').run(blockedMargin, userId);
      }
    }

    db.prepare("UPDATE orders SET status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP WHERE id = ?").run(orderId);

    return { success: true, message: `Order ${orderId} cancelled successfully.` };
  });

  return cancelTx();
}

export function modifyOrder(orderId: string, userId: string, newQty: number, newPrice?: number) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, userId) as any;
  if (!order) {
    throw new Error('Order not found.');
  }

  if (order.status !== 'PENDING' && order.status !== 'AMO') {
    throw new Error(`Cannot modify order in status: ${order.status}`);
  }

  if (newQty <= 0 || !Number.isInteger(newQty)) {
    throw new Error('Quantity must be a positive integer.');
  }

  db.prepare(`
    UPDATE orders 
    SET quantity = ?, price = COALESCE(?, price) 
    WHERE id = ?
  `).run(newQty, newPrice || null, orderId);

  return { success: true, message: `Order ${orderId} modified successfully.` };
}

export function getUserPositions(userId: string): PositionRecord[] {
  const rows = db.prepare(`
    SELECT p.*, i.name, i.current_price, i.previous_close, i.change, i.percent_change, i.sector
    FROM positions p
    JOIN instruments i ON p.symbol = i.symbol
    WHERE p.user_id = ?
    ORDER BY p.updated_at DESC
  `).all(userId) as any[];

  return rows.map((r) => {
    const invested = roundRupee(r.quantity * r.average_price);
    const currentVal = roundRupee(r.quantity * r.current_price);
    const unrealizedPnl = roundRupee(currentVal - invested);
    const unrealizedPnlPercent = invested > 0 ? Number(((unrealizedPnl / invested) * 100).toFixed(2)) : 0;
    const dayPnl = roundRupee(r.quantity * (r.change || 0));
    const dayPnlPercent = currentVal > 0 ? Number(((dayPnl / (currentVal - dayPnl || 1)) * 100).toFixed(2)) : 0;

    return {
      id: r.id,
      user_id: r.user_id,
      symbol: r.symbol,
      name: r.name,
      product_type: r.product_type || 'CNC',
      quantity: r.quantity,
      average_price: r.average_price,
      current_price: r.current_price,
      previous_close: r.previous_close,
      invested_value: invested,
      current_value: currentVal,
      unrealized_pnl: unrealizedPnl,
      unrealized_pnl_percent: unrealizedPnlPercent,
      day_pnl: dayPnl,
      day_pnl_percent: dayPnlPercent,
      realized_pnl: r.realized_pnl || 0,
      sector: r.sector || 'General',
    };
  });
}

export function getUserPortfolioSummary(userId: string): PortfolioSummary {
  const user = db.prepare('SELECT virtual_cash, blocked_margin, initial_capital FROM users WHERE id = ?').get(userId) as any;
  const virtualCash = user ? user.virtual_cash : 1000000;
  const blockedMargin = user ? (user.blocked_margin || 0) : 0;
  const availableCash = Math.max(0, roundRupee(virtualCash - blockedMargin));
  const initialCapital = user?.initial_capital ? user.initial_capital : 1000000.0;

  const positions = getUserPositions(userId);

  let investedValue = 0;
  let currentPositionsValue = 0;
  let unrealizedPnl = 0;
  let realizedPnl = 0;
  let dayHoldingsPnl = 0;

  const sectorMap = new Map<string, number>();

  for (const pos of positions) {
    investedValue += pos.invested_value;
    currentPositionsValue += pos.current_value;
    unrealizedPnl += pos.unrealized_pnl;
    realizedPnl += pos.realized_pnl;
    dayHoldingsPnl += pos.day_pnl;

    const sec = pos.sector || 'General';
    sectorMap.set(sec, (sectorMap.get(sec) || 0) + pos.current_value);
  }

  // Today's realized P&L from trades today
  const todayTrades = db.prepare(`
    SELECT t.*, p.average_price
    FROM trades t
    LEFT JOIN positions p ON t.user_id = p.user_id AND t.symbol = p.symbol
    WHERE t.user_id = ? AND DATE(t.created_at) = DATE('now')
  `).all(userId) as any[];

  let todayRealizedPnl = 0;
  for (const t of todayTrades) {
    if (t.side === 'SELL' && t.average_price) {
      todayRealizedPnl += (t.price - t.average_price) * t.quantity;
    }
  }

  const currentPortfolioValue = roundRupee((Number(virtualCash) || 0) + (Number(currentPositionsValue) || 0));
  const overallPnl = roundRupee(currentPortfolioValue - initialCapital);
  const overallPnlPercent = initialCapital > 0 ? Number(((overallPnl / initialCapital) * 100).toFixed(2)) : 0;

  const todayPnl = roundRupee((Number(dayHoldingsPnl) || 0) + (Number(todayRealizedPnl) || 0));
  const prevPortfolioValue = currentPortfolioValue - todayPnl;
  const todayPnlPercent = prevPortfolioValue > 0 ? Number(((todayPnl / prevPortfolioValue) * 100).toFixed(2)) : 0;

  const ordersCount = (db.prepare('SELECT COUNT(*) as cnt FROM orders WHERE user_id = ?').get(userId) as { cnt: number }).cnt;

  // Sector allocations
  const sectorAllocations = Array.from(sectorMap.entries()).map(([sector, val]) => ({
    sector,
    value: roundRupee(val),
    percentage: currentPositionsValue > 0 ? Number(((val / currentPositionsValue) * 100).toFixed(1)) : 0,
  }));

  return {
    userId,
    virtualCash: roundRupee(virtualCash),
    availableCash,
    blockedMargin,
    initialCapital,
    investedValue: roundRupee(investedValue),
    currentPortfolioValue,
    todayPnl,
    todayPnlPercent,
    overallPnl,
    overallPnlPercent,
    realizedPnl: roundRupee(realizedPnl),
    unrealizedPnl: roundRupee(unrealizedPnl),
    positionsCount: positions.length,
    ordersCount,
    sectorAllocations,
  };
}

export function resetUserAccount(userId: string, newCapital?: number) {
  const resetTx = db.transaction(() => {
    const user = db.prepare('SELECT initial_capital FROM users WHERE id = ?').get(userId) as any;
    const capital = newCapital || user?.initial_capital || 1000000.0;

    // Remove user positions, orders, trades, and blocked margins
    db.prepare('DELETE FROM positions WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM orders WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM trades WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM transactions WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM ledger_entries WHERE user_id = ?').run(userId);

    // Reset user virtual cash and capital
    db.prepare(`
      UPDATE users 
      SET virtual_cash = ?, initial_capital = ?, blocked_margin = 0.0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(capital, capital, userId);

    // Record initial ledger entry
    recordLedgerEntry({
      userId,
      direction: 'CREDIT',
      accountKind: 'CASH',
      amountPaise: toPaise(capital),
      refType: 'ACCOUNT_RESET',
      memo: `Account reset with virtual capital ₹${capital.toLocaleString('en-IN')}`,
    });

    return {
      success: true,
      virtualCash: capital,
      initialCapital: capital,
      message: `Account successfully reset with starting capital ₹${capital.toLocaleString('en-IN')}.`,
    };
  });

  return resetTx();
}

export function getUserOrders(userId: string, status?: string) {
  if (status) {
    return db.prepare('SELECT * FROM orders WHERE user_id = ? AND status = ? ORDER BY created_at DESC').all(userId, status);
  }
  return db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}

export function getUserTrades(userId: string) {
  return db.prepare(`
    SELECT t.*, o.order_type, o.product_type
    FROM trades t
    JOIN orders o ON t.order_id = o.id
    WHERE t.user_id = ?
    ORDER BY t.created_at DESC
  `).all(userId);
}
