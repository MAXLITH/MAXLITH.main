import { describe, it, expect } from 'vitest';
import { calculateCharges } from '../src/lib/charges';

describe('Indian Regulatory Charges Model', () => {
  it('calculates charges for Equity Delivery (CNC) BUY', () => {
    const res = calculateCharges({
      turnover: 100000, // 1 Lakh
      side: 'BUY',
      productType: 'CNC',
    });

    // Zero brokerage in discount model
    expect(res.brokerage).toBe(0);
    // STT is 0.1% on buy & sell for delivery
    expect(res.stt).toBe(100);
    // Stamp duty 0.015% on buy
    expect(res.stampDuty).toBe(15);
    // Exchange txn ~0.00297%
    expect(res.exchangeTxn).toBeGreaterThan(0);
    // SEBI fee ₹10 per crore (0.0001%)
    expect(res.sebi).toBeGreaterThan(0);
    // GST 18% on (brokerage + exchange txn + sebi fees)
    expect(res.gst).toBeGreaterThan(0);
    expect(res.totalCharges).toBeGreaterThan(115);
  });

  it('calculates charges for Equity Delivery (CNC) SELL', () => {
    const res = calculateCharges({
      turnover: 100000,
      side: 'SELL',
      productType: 'CNC',
    });

    expect(res.brokerage).toBe(0);
    // STT is 0.1% on delivery sell
    expect(res.stt).toBe(100);
    // Stamp duty is 0 on sell
    expect(res.stampDuty).toBe(0);
    expect(res.totalCharges).toBeGreaterThan(100);
  });

  it('calculates charges for Equity Intraday (MIS) BUY & SELL', () => {
    const buyRes = calculateCharges({
      turnover: 200000,
      side: 'BUY',
      productType: 'MIS',
    });

    // Brokerage capped at ₹20
    expect(buyRes.brokerage).toBeLessThanOrEqual(20);
    // STT is 0 on intraday buy
    expect(buyRes.stt).toBe(0);
    // Stamp duty 0.003% on intraday buy
    expect(buyRes.stampDuty).toBe(6);

    const sellRes = calculateCharges({
      turnover: 200000,
      side: 'SELL',
      productType: 'MIS',
    });

    // STT is 0.025% on intraday sell
    expect(sellRes.stt).toBe(50);
    // Stamp duty is 0 on intraday sell
    expect(sellRes.stampDuty).toBe(0);
  });

  it('provides all values in integer paise', () => {
    const res = calculateCharges({
      turnover: 50000,
      side: 'BUY',
      productType: 'CNC',
    });

    expect(Number.isInteger(res.totalChargesPaise)).toBe(true);
    expect(Number.isInteger(res.brokeragePaise)).toBe(true);
    expect(Number.isInteger(res.sttPaise)).toBe(true);
    expect(Number.isInteger(res.gstPaise)).toBe(true);
  });
});
