import db from '../db';
import { getMarketSessionStatus } from '../market-hours';
import { calculateCharges } from '../charges';
import { roundRupee, toPaise } from '../money';
import { newId } from '../ids';
import { recordLedgerEntry } from '../ledger';

/**
 * Evaluates all PENDING and AMO orders against current instrument LTP
 */
export function evaluatePendingOrders(): number {
  const status = getMarketSessionStatus();
  let filledCount = 0;

  // Process AMO orders if market is now OPEN
  if (status.isOpen) {
    const amoOrders = db.prepare("SELECT * FROM orders WHERE status = 'AMO'").all() as any[];
    for (const ord of amoOrders) {
      db.prepare("UPDATE orders SET status = 'PENDING' WHERE id = ?").run(ord.id);
    }
  }

  // Only evaluate matching during market open or test simulation
  const pendingOrders = db.prepare("SELECT * FROM orders WHERE status = 'PENDING'").all() as any[];

  for (const ord of pendingOrders) {
    const inst = db.prepare('SELECT current_price FROM instruments WHERE symbol = ?').get(ord.symbol) as any;
    if (!inst) continue;

    const ltp = inst.current_price;
    let shouldFill = false;
    let fillPrice = ltp;

    if (ord.order_type === 'MARKET') {
      shouldFill = status.isOpen;
      fillPrice = ltp;
    } else if (ord.order_type === 'LIMIT') {
      if (ord.side === 'BUY' && ltp <= ord.price) {
        shouldFill = true;
        fillPrice = Math.min(ltp, ord.price);
      } else if (ord.side === 'SELL' && ltp >= ord.price) {
        shouldFill = true;
        fillPrice = Math.max(ltp, ord.price);
      }
    } else if (ord.order_type === 'SL' || ord.order_type === 'SL-M') {
      if (ord.trigger_price) {
        if (ord.side === 'SELL' && ltp <= ord.trigger_price) {
          shouldFill = true;
          fillPrice = ord.order_type === 'SL' ? (ord.price || ltp) : ltp;
        } else if (ord.side === 'BUY' && ltp >= ord.trigger_price) {
          shouldFill = true;
          fillPrice = ord.order_type === 'SL' ? (ord.price || ltp) : ltp;
        }
      }
    }

    if (shouldFill) {
      try {
        fillPendingOrder(ord, fillPrice);
        filledCount++;
      } catch (err) {
        console.error(`Error filling order ${ord.id}:`, err);
      }
    }
  }

  return filledCount;
}

function fillPendingOrder(order: any, executedPrice: number) {
  const charges = calculateCharges({
    side: order.side,
    productType: order.product_type || 'CNC',
    quantity: order.quantity,
    price: executedPrice,
  });

  const tx = db.transaction(() => {
    const tradeId = newId('trd');

    // Unblock margin if BUY
    if (order.side === 'BUY') {
      let blockedMargin = 0;
      if (order.charges_json) {
        try {
          const ch = JSON.parse(order.charges_json);
          const marginMult = order.product_type === 'MIS' ? 5 : 1;
          blockedMargin = roundRupee(ch.turnover / marginMult + ch.totalCharges);
        } catch {}
      } else {
        const marginMult = order.product_type === 'MIS' ? 5 : 1;
        blockedMargin = roundRupee((order.quantity * (order.price || executedPrice)) / marginMult);
      }

      if (blockedMargin > 0) {
        db.prepare('UPDATE users SET blocked_margin = MAX(0, blocked_margin - ?) WHERE id = ?').run(blockedMargin, order.user_id);
      }

      // Deduct actual net execution amount
      db.prepare('UPDATE users SET virtual_cash = virtual_cash - ? WHERE id = ?').run(charges.netAmount, order.user_id);

      // Ledger record
      recordLedgerEntry({
        userId: order.user_id,
        direction: 'DEBIT',
        accountKind: 'CASH',
        amountPaise: toPaise(charges.netAmount),
        refType: 'TRADE_BUY',
        refId: tradeId,
        memo: `Filled ${order.side} order ${order.id}: ${order.quantity} ${order.symbol} @ ₹${executedPrice}`,
      });

      // Update position
      const existingPos = db.prepare('SELECT * FROM positions WHERE user_id = ? AND symbol = ? AND product_type = ?').get(order.user_id, order.symbol, order.product_type || 'CNC') as any;
      if (existingPos) {
        const newQty = existingPos.quantity + order.quantity;
        const newAvg = roundRupee(((existingPos.quantity * existingPos.average_price) + (order.quantity * executedPrice)) / newQty);
        db.prepare('UPDATE positions SET quantity = ?, average_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newQty, newAvg, existingPos.id);
      } else {
        db.prepare(`
          INSERT INTO positions (id, user_id, symbol, product_type, quantity, average_price, realized_pnl, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 0.0, CURRENT_TIMESTAMP)
        `).run(newId('pos'), order.user_id, order.symbol, order.product_type || 'CNC', order.quantity, executedPrice);
      }
    } else if (order.side === 'SELL') {
      db.prepare('UPDATE users SET virtual_cash = virtual_cash + ? WHERE id = ?').run(charges.netAmount, order.user_id);

      recordLedgerEntry({
        userId: order.user_id,
        direction: 'CREDIT',
        accountKind: 'CASH',
        amountPaise: toPaise(charges.netAmount),
        refType: 'TRADE_SELL',
        refId: tradeId,
        memo: `Filled ${order.side} order ${order.id}: ${order.quantity} ${order.symbol} @ ₹${executedPrice}`,
      });

      const existingPos = db.prepare('SELECT * FROM positions WHERE user_id = ? AND symbol = ? AND product_type = ?').get(order.user_id, order.symbol, order.product_type || 'CNC') as any;
      if (existingPos) {
        const tradeRealizedPnl = roundRupee((executedPrice - existingPos.average_price) * order.quantity);
        const remainingQty = existingPos.quantity - order.quantity;
        const newRealized = roundRupee((existingPos.realized_pnl || 0) + tradeRealizedPnl);

        if (remainingQty <= 0) {
          db.prepare('DELETE FROM positions WHERE id = ?').run(existingPos.id);
        } else {
          db.prepare('UPDATE positions SET quantity = ?, realized_pnl = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(remainingQty, newRealized, existingPos.id);
        }
      }
    }

    // Insert Trade
    db.prepare(`
      INSERT INTO trades (id, order_id, user_id, symbol, side, quantity, price, charges_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(tradeId, order.id, order.user_id, order.symbol, order.side, order.quantity, executedPrice, JSON.stringify(charges));

    // Update Order to EXECUTED
    db.prepare(`
      UPDATE orders 
      SET status = 'EXECUTED', executed_price = ?, filled_qty = quantity, executed_at = CURRENT_TIMESTAMP, charges_json = ?
      WHERE id = ?
    `).run(executedPrice, JSON.stringify(charges), order.id);

    // Create Notification
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, body, kind, ref_id, created_at)
      VALUES (?, ?, ?, ?, 'ORDER_FILLED', ?, CURRENT_TIMESTAMP)
    `).run(
      newId('notif'),
      order.user_id,
      `Order Executed: ${order.symbol}`,
      `Your ${order.side} order for ${order.quantity} shares of ${order.symbol} executed at ₹${executedPrice.toFixed(2)}.`,
      order.id
    );
  });

  tx();
}

/**
 * Intraday MIS positions auto square-off at 15:15 IST
 */
export function autoSquareOffMIS(): number {
  const status = getMarketSessionStatus();
  if (!status.squareOffWindow && !process.env.FORCE_SQUARE_OFF) {
    return 0;
  }

  const misPositions = db.prepare("SELECT * FROM positions WHERE product_type = 'MIS' AND quantity > 0").all() as any[];
  let squaredCount = 0;

  for (const pos of misPositions) {
    const inst = db.prepare('SELECT current_price FROM instruments WHERE symbol = ?').get(pos.symbol) as any;
    if (!inst) continue;

    try {
      const exitOrder = {
        userId: pos.user_id,
        symbol: pos.symbol,
        side: 'SELL' as const,
        orderType: 'MARKET' as const,
        productType: 'MIS' as const,
        quantity: pos.quantity,
      };

      const charges = calculateCharges({
        side: 'SELL',
        productType: 'MIS',
        quantity: pos.quantity,
        price: inst.current_price,
      });

      const tx = db.transaction(() => {
        const orderId = newId('ord-sq');
        const tradeId = newId('trd-sq');

        db.prepare('UPDATE users SET virtual_cash = virtual_cash + ? WHERE id = ?').run(charges.netAmount, pos.user_id);

        const tradeRealizedPnl = roundRupee((inst.current_price - pos.average_price) * pos.quantity);
        db.prepare('DELETE FROM positions WHERE id = ?').run(pos.id);

        db.prepare(`
          INSERT INTO orders (id, user_id, symbol, side, order_type, product_type, quantity, price, executed_price, status, created_at, executed_at)
          VALUES (?, ?, ?, 'SELL', 'MARKET', 'MIS', ?, ?, ?, 'EXECUTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(orderId, pos.user_id, pos.symbol, pos.quantity, inst.current_price, inst.current_price);

        db.prepare(`
          INSERT INTO trades (id, order_id, user_id, symbol, side, quantity, price, charges_json, created_at)
          VALUES (?, ?, ?, ?, 'SELL', ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(tradeId, orderId, pos.user_id, pos.symbol, pos.quantity, inst.current_price, JSON.stringify(charges));

        recordLedgerEntry({
          userId: pos.user_id,
          direction: 'CREDIT',
          accountKind: 'CASH',
          amountPaise: toPaise(charges.netAmount),
          refType: 'TRADE_SELL',
          refId: tradeId,
          memo: `MIS Auto Square-Off: Sold ${pos.quantity} ${pos.symbol} @ ₹${inst.current_price}`,
        });

        db.prepare(`
          INSERT INTO notifications (id, user_id, title, body, kind, ref_id, created_at)
          VALUES (?, ?, ?, ?, 'AUTO_SQUARE_OFF', ?, CURRENT_TIMESTAMP)
        `).run(
          newId('notif'),
          pos.user_id,
          `MIS Auto Square-off: ${pos.symbol}`,
          `Your intraday position of ${pos.quantity} ${pos.symbol} was automatically squared off at ₹${inst.current_price.toFixed(2)} with P&L ₹${tradeRealizedPnl.toFixed(2)}.`,
          orderId
        );
      });

      tx();
      squaredCount++;
    } catch (err) {
      console.error(`Failed to square off MIS position for ${pos.symbol}:`, err);
    }
  }

  return squaredCount;
}

/**
 * Checks price alerts against live instruments and triggers notifications
 */
export function evaluatePriceAlerts(): number {
  const activeAlerts = db.prepare('SELECT * FROM alerts WHERE is_triggered = 0').all() as any[];
  let triggeredCount = 0;

  for (const alert of activeAlerts) {
    const inst = db.prepare('SELECT current_price FROM instruments WHERE symbol = ?').get(alert.symbol) as any;
    if (!inst) continue;

    const ltp = inst.current_price;
    let shouldTrigger = false;

    if (alert.condition === 'ABOVE' && ltp >= alert.target_value) {
      shouldTrigger = true;
    } else if (alert.condition === 'BELOW' && ltp <= alert.target_value) {
      shouldTrigger = true;
    }

    if (shouldTrigger) {
      db.transaction(() => {
        db.prepare("UPDATE alerts SET is_triggered = 1, triggered_at = CURRENT_TIMESTAMP WHERE id = ?").run(alert.id);

        db.prepare(`
          INSERT INTO notifications (id, user_id, title, body, kind, ref_id, created_at)
          VALUES (?, ?, ?, ?, 'PRICE_ALERT', ?, CURRENT_TIMESTAMP)
        `).run(
          newId('notif'),
          alert.user_id,
          `Price Alert: ${alert.symbol}`,
          `${alert.symbol} traded at ₹${ltp.toFixed(2)}, breaching your alert threshold of ₹${alert.target_value.toFixed(2)} (${alert.condition}).`,
          alert.id
        );
      })();
      triggeredCount++;
    }
  }

  return triggeredCount;
}

/**
 * Daily portfolio snapshot for equity curve
 */
export function takeDailyPortfolioSnapshots(): number {
  const users = db.prepare('SELECT id, virtual_cash FROM users').all() as any[];
  let count = 0;
  const today = new Date().toISOString().split('T')[0];

  for (const u of users) {
    const holdings = db.prepare(`
      SELECT SUM(p.quantity * i.current_price) as total_holdings
      FROM positions p
      JOIN instruments i ON p.symbol = i.symbol
      WHERE p.user_id = ?
    `).get(u.id) as any;

    const holdingsValue = holdings?.total_holdings || 0;
    const portfolioValue = roundRupee(u.virtual_cash + holdingsValue);

    db.prepare(`
      INSERT INTO portfolio_snapshots (id, user_id, as_of, cash, holdings_value, portfolio_value)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, as_of) DO UPDATE SET
        cash = excluded.cash,
        holdings_value = excluded.holdings_value,
        portfolio_value = excluded.portfolio_value
    `).run(newId('snap'), u.id, today, u.virtual_cash, holdingsValue, portfolioValue);
    count++;
  }

  return count;
}
