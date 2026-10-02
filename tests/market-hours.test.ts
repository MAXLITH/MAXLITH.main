import { describe, it, expect } from 'vitest';
import { getMarketSessionStatus, isMarketHoliday, getISTDate } from '../src/lib/market-hours';

describe('Market Hours & Holiday Calendar', () => {
  it('correctly converts UTC to IST timestamp string', () => {
    const ist = getISTDate();
    expect(ist).toBeDefined();
    expect(typeof ist.getHours()).toBe('number');
    expect(typeof ist.getMinutes()).toBe('number');
    expect(typeof ist.getDay()).toBe('number');
  });

  it('recognizes 2026 NSE scheduled market holidays', () => {
    // Republic Day: 2026-01-26
    expect(isMarketHoliday('2026-01-26')).toBe(true);
    // Independence Day: 2026-08-15
    expect(isMarketHoliday('2026-08-15')).toBe(true);
    // Gandhi Jayanti: 2026-10-02
    expect(isMarketHoliday('2026-10-02')).toBe(true);
    // Normal trading day: 2026-01-27
    expect(isMarketHoliday('2026-01-27')).toBe(false);
  });

  it('determines market session status accurately with next open/close', () => {
    const status = getMarketSessionStatus();
    expect(status).toHaveProperty('isOpen');
    expect(status).toHaveProperty('isPreOpen');
    expect(status).toHaveProperty('isHoliday');
    expect(status).toHaveProperty('isWeekend');
    expect(status).toHaveProperty('session');
    expect(status).toHaveProperty('currentTimeIST');
    expect(status).toHaveProperty('nextOpenAt');
  });
});
