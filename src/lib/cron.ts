import cron from 'node-cron';
import { evaluatePendingOrders, autoSquareOffMIS, evaluatePriceAlerts, takeDailyPortfolioSnapshots } from './paper-trading';

let isCronStarted = false;

export function initBackgroundJobs() {
  if (isCronStarted) return;
  isCronStarted = true;

  // 1. High frequency matching & price alert check (every 3 seconds)
  setInterval(() => {
    try {
      evaluatePendingOrders();
      evaluatePriceAlerts();
    } catch (err) {
      /* ignore tick error */
    }
  }, 3000);

  // 2. MIS Auto square-off at 15:15 IST (Mon-Fri) - 09:45 UTC
  cron.schedule('15 15 * * 1-5', () => {
    try {
      const squared = autoSquareOffMIS();
      if (squared > 0) {
        console.log(`[CRON] Auto squared off ${squared} MIS positions at 15:15 IST.`);
      }
    } catch (err) {
      console.error('[CRON] Error during MIS auto square-off:', err);
    }
  }, { timezone: 'Asia/Kolkata' });

  // 3. Daily portfolio equity snapshot at 15:45 IST (Mon-Fri)
  cron.schedule('45 15 * * 1-5', () => {
    try {
      const snapCount = takeDailyPortfolioSnapshots();
      console.log(`[CRON] Took ${snapCount} daily portfolio snapshots at 15:45 IST.`);
    } catch (err) {
      console.error('[CRON] Error during daily snapshot job:', err);
    }
  }, { timezone: 'Asia/Kolkata' });
}

// Automatically initiate jobs
initBackgroundJobs();
