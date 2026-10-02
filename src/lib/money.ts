import { Decimal } from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN });

export function toPaise(rupees: number | string | Decimal): number {
  return new Decimal(rupees).mul(100).toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN).toNumber();
}

export function fromPaise(paise: number): number {
  return new Decimal(paise).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN).toNumber();
}

export function roundRupee(value: number | string | Decimal): number {
  return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN).toNumber();
}

export function mulMoney(a: number, b: number): number {
  return roundRupee(new Decimal(a).mul(b));
}

export function addMoney(...vals: number[]): number {
  return roundRupee(vals.reduce((acc, v) => acc.add(v), new Decimal(0)));
}

export function applySlippage(ltp: number, side: 'BUY' | 'SELL', slippageBps: number): number {
  const factor = new Decimal(slippageBps).div(10_000);
  if (side === 'BUY') return roundRupee(new Decimal(ltp).mul(new Decimal(1).add(factor)));
  return roundRupee(new Decimal(ltp).mul(new Decimal(1).sub(factor)));
}

export function roundToTick(price: number, tick = 0.05): number {
  const t = new Decimal(tick);
  return new Decimal(price).div(t).toDecimalPlaces(0, Decimal.ROUND_HALF_EVEN).mul(t).toNumber();
}

export function formatINR(value: number): string {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function paiseBigIntToRupees(paise: bigint): number {
  return Number(paise) / 100;
}

export function rupeesToPaiseBigInt(rupees: number): bigint {
  return BigInt(toPaise(rupees));
}

