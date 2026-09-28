import db from '../db';
import { getInstrument, getMarketSessionStatus } from '../market-data';

export interface OrderRequest {
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  quantity: number;
  limitPrice?: number;
}

export interface Position {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  quantity: number;
  average_price: number;
  current_price: number;
  invested_value: number;
  current_value: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  realized_pnl: number;
}

export interface PortfolioSummary {
  userId: string;
  virtualCash: number;
  investedValue: number;
  currentPortfolioValue: number;
  todayPnl: number;
  todayPnlPercent: number;
  overallPnl: number;
  overallPnlPercent: number;
  realizedPnl: number;
  unrealizedPnl: number;
  positionsCount: number;
  ordersCount: number;
}

export function executePaperOrder(request: OrderRequest) {
  const { userId, symbol, side, orderType, quantity, limitPrice } = request;

  if (quantity <= 0 || !Number.isInteger(quantity)) {
    throw new Error('Quantity must be a positive integer.');
  }

  const instrument = getInstrument(symbol);
  if (!instrument) {
    throw new Error(`Instrument ${symbol} not found.`);
  }

  const user = db.prepare('SELECT id, virtual_cash FROM users WHERE id = ?').get(userId) as {
    id: string;
    virtual_cash: number;
  } | undefined;

  if (!user) {
    throw new Error('User not found.');
  }

  const executionPrice = instrument.current_price;
  const targetPrice = orderType === 'LIMIT' && limitPrice ? limitPrice : executionPrice;

  // Determine if order executes immediately
  let status: 'EXECUTED' | 'PENDING' | 'REJECTED' = 'EXECUTED';
  let rejectionReason: string | null = null;

  if (orderType === 'LIMIT') {
    if (side === 'BUY' && executionPrice > targetPrice) {
      status = 'PENDING';
    } else if (side === 'SELL' && executionPrice < targetPrice) {
      status = 'PENDING';
    }
  }

  const totalCost = quantity * executionPrice;

  // Process transaction in SQLite ACID transaction block
  const runTransaction = db.transaction(() => {
    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    if (side === 'BUY') {
      if (user.virtual_cash < totalCost) {
        status = 'REJECTED';
        rejectionReason = `Insufficient virtual cash. Required ₹${totalCost.toLocaleString('en-IN')}, available ₹${user.virtual_cash.toLocaleString('en-IN')}`;
      }

      if (status === 'REJECTED') {
        db.prepare(`
          INSERT INTO orders (id, user_id, symbol, side, order_type, quantity, price, executed_price, status, rejection_reason)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(orderId, userId, symbol, side, orderType, quantity, targetPrice, null, status, rejectionReason);
        return { success: false, message: rejectionReason, orderId };
      }

      if (status === 'EXECUTED') {
        // Deduct Virtual Cash
        db.prepare('UPDATE users SET virtual_cash = virtual_cash - ? WHERE id = ?').run(totalCost, userId);

        // Update or insert Position
        const existingPos = db.prepare('SELECT * FROM positions WHERE user_id = ? AND symbol = ?').get(userId, symbol) as {
          id: string;
          quantity: number;
          average_price: number;
          realized_pnl: number;
        } | undefined;

        if (existingPos) {
          const newQty = existingPos.quantity + quantity;
          const newAvgPrice = ((existingPos.quantity * existingPos.average_price) + (quantity * executionPrice)) / newQty;
          db.prepare(`
            UPDATE positions 
            SET quantity = ?, average_price = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ? AND symbol = ?
          `).run(newQty, newAvgPrice, userId, symbol);
        } else {
          const posId = `pos-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
          db.prepare(`
            INSERT INTO positions (id, user_id, symbol, quantity, average_price)
            VALUES (?, ?, ?, ?, ?)
          `).run(posId, userId, symbol, quantity, executionPrice);
        }

        // Record Transaction
        const txId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        db.prepare(`
          INSERT INTO transactions (id, user_id, order_id, symbol, type, amount, quantity, price)
          VALUES (?, ?, ?, ?, 'BUY', ?, ?, ?)
        `).run(txId, userId, orderId, symbol, totalCost, quantity, executionPrice);
      }
    } else if (side === 'SELL') {
      const existingPos = db.prepare('SELECT * FROM positions WHERE user_id = ? AND symbol = ?').get(userId, symbol) as {
        id: string;
        quantity: number;
        average_price: number;
        realized_pnl: number;
      } | undefined;

      if (!existingPos || existingPos.quantity < quantity) {
        status = 'REJECTED';
        rejectionReason = `Insufficient position. Owned: ${existingPos ? existingPos.quantity : 0} shares, requested sell: ${quantity} shares`;
        db.prepare(`
          INSERT INTO orders (id, user_id, symbol, side, order_type, quantity, price, executed_price, status, rejection_reason)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(orderId, userId, symbol, side, orderType, quantity, targetPrice, null, status, rejectionReason);
        return { success: false, message: rejectionReason, orderId };
      }

      if (status === 'EXECUTED') {
        const proceeds = quantity * executionPrice;
        const tradeRealizedPnl = (executionPrice - existingPos.average_price) * quantity;

        // Add proceeds to Virtual Cash
        db.prepare('UPDATE users SET virtual_cash = virtual_cash + ? WHERE id = ?').run(proceeds, userId);

        // Update position
        const remainingQty = existingPos.quantity - quantity;
        const newRealizedPnl = existingPos.realized_pnl + tradeRealizedPnl;

        if (remainingQty === 0) {
          db.prepare('DELETE FROM positions WHERE id = ?').run(existingPos.id);
        } else {
          db.prepare(`
            UPDATE positions 
            SET quantity = ?, realized_pnl = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(remainingQty, newRealizedPnl, existingPos.id);
        }

        // Record Transaction
        const txId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        db.prepare(`
          INSERT INTO transactions (id, user_id, order_id, symbol, type, amount, quantity, price)
          VALUES (?, ?, ?, ?, 'SELL', ?, ?, ?)
        `).run(txId, userId, orderId, symbol, proceeds, quantity, executionPrice);
      }
    }

    // Insert Order Record
    db.prepare(`
      INSERT INTO orders (id, user_id, symbol, side, order_type, quantity, price, executed_price, status, rejection_reason, executed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderId,
      userId,
      symbol,
      side,
      orderType,
      quantity,
      targetPrice,
      status === 'EXECUTED' ? executionPrice : null,
      status,
      rejectionReason,
      status === 'EXECUTED' ? new Date().toISOString() : null
    );

    return {
      success: status === 'EXECUTED',
      status,
      orderId,
      executedPrice: status === 'EXECUTED' ? executionPrice : null,
      message: status === 'EXECUTED' ? `Paper Trade executed successfully: ${side} ${quantity} ${symbol} @ ₹${executionPrice.toFixed(2)}` : `Order status: ${status}`
    };
  });

  return runTransaction();
}

export function getUserPositions(userId: string): Position[] {
  const rows = db.prepare(`
    SELECT p.*, i.name, i.current_price, i.change, i.percent_change
    FROM positions p
    JOIN instruments i ON p.symbol = i.symbol
    WHERE p.user_id = ?
    ORDER BY p.updated_at DESC
  `).all(userId) as any[];

  return rows.map((r) => {
    const invested = r.quantity * r.average_price;
    const currentVal = r.quantity * r.current_price;
    const unrealizedPnl = currentVal - invested;
    const unrealizedPnlPercent = invested > 0 ? (unrealizedPnl / invested) * 100 : 0;

    return {
      id: r.id,
      user_id: r.user_id,
      symbol: r.symbol,
      name: r.name,
      quantity: r.quantity,
      average_price: r.average_price,
      current_price: r.current_price,
      invested_value: invested,
      current_value: currentVal,
      unrealized_pnl: unrealizedPnl,
      unrealized_pnl_percent: unrealizedPnlPercent,
      realized_pnl: r.realized_pnl || 0
    };
  });
}

export function getUserPortfolioSummary(userId: string): PortfolioSummary {
  const user = db.prepare('SELECT virtual_cash FROM users WHERE id = ?').get(userId) as { virtual_cash: number } | undefined;
  const virtualCash = user ? user.virtual_cash : 1000000;
  const initialCapital = 1000000.0;

  const positions = getUserPositions(userId);

  let investedValue = 0;
  let currentPositionsValue = 0;
  let unrealizedPnl = 0;
  let realizedPnl = 0;

  for (const pos of positions) {
    investedValue += pos.invested_value;
    currentPositionsValue += pos.current_value;
    unrealizedPnl += pos.unrealized_pnl;
    realizedPnl += pos.realized_pnl;
  }

  const currentPortfolioValue = virtualCash + currentPositionsValue;
  const overallPnl = currentPortfolioValue - initialCapital;
  const overallPnlPercent = (overallPnl / initialCapital) * 100;

  // Calculate today's P&L based on holdings daily % change
  let todayPnl = 0;
  for (const pos of positions) {
    const inst = getInstrument(pos.symbol);
    if (inst) {
      todayPnl += pos.quantity * inst.change;
    }
  }
  const todayPnlPercent = currentPortfolioValue > 0 ? (todayPnl / currentPortfolioValue) * 100 : 0;

  const ordersCount = (db.prepare('SELECT COUNT(*) as cnt FROM orders WHERE user_id = ?').get(userId) as { cnt: number }).cnt;

  return {
    userId,
    virtualCash,
    investedValue,
    currentPortfolioValue,
    todayPnl,
    todayPnlPercent,
    overallPnl,
    overallPnlPercent,
    realizedPnl,
    unrealizedPnl,
    positionsCount: positions.length,
    ordersCount
  };
}

export function getUserOrders(userId: string) {
  return db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(userId);
}
