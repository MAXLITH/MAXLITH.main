import { Decimal } from 'decimal.js';
import { roundRupee } from './money';
import { roundRupee, toPaise } from './money';

export type ProductType = 'CNC' | 'MIS';

export interface ChargeBreakdown {
  turnover: number;
  brokerage: number;
  stt: number;
  exchangeTxn: number;
  sebi: number;
  stampDuty: number;
  gst: number;
  totalCharges: number;
  netAmount: number;
  totalChargesPaise?: number;
  brokeragePaise?: number;
  sttPaise?: number;
  gstPaise?: number;
}

/**
 * Configurable Indian equity charges model (paper trading approximation).
 * Env overrides: BROKERAGE_FLAT, BROKERAGE_PCT, STT_DELIVERY_PCT, etc.
 */
export function calculateCharges(params: {
  side: 'BUY' | 'SELL';
  productType: ProductType;
  quantity: number;
  price: number;
  quantity?: number;
  price?: number;
  turnover?: number;
}): ChargeBreakdown {
  const turnover = roundRupee(new Decimal(params.quantity).mul(params.price).toNumber());
  const turnover = params.turnover !== undefined
    ? roundRupee(params.turnover)
    : roundRupee(new Decimal(params.quantity || 0).mul(params.price || 0).toNumber());
  const t = new Decimal(turnover);
  const isDelivery = params.productType === 'CNC';
  const isSell = params.side === 'SELL';

  const brokeragePct = Number(process.env.BROKERAGE_PCT || 0.0003);
  const brokerageCap = Number(process.env.BROKERAGE_CAP || 20);
  let brokerage = roundRupee(Decimal.min(t.mul(brokeragePct), brokerageCap).toNumber());
  if (isDelivery && process.env.DELIVERY_BROKERAGE !== 'true') {
    brokerage = 0;
  }

  let stt = 0;
  if (isDelivery) {
    stt = roundRupee(t.mul(Number(process.env.STT_DELIVERY_PCT || 0.001)).toNumber());
  } else if (isSell) {
    stt = roundRupee(t.mul(Number(process.env.STT_INTRADAY_SELL_PCT || 0.00025)).toNumber());
  }

  const exchangeTxn = roundRupee(t.mul(Number(process.env.EXCHANGE_TXN_PCT || 0.0000297)).toNumber());
  const sebi = roundRupee(t.mul(Number(process.env.SEBI_PCT || 0.000001)).toNumber());

  let stampDuty = 0;
  if (params.side === 'BUY') {
    stampDuty = roundRupee(
      t.mul(isDelivery ? Number(process.env.STAMP_DELIVERY_PCT || 0.00015) : Number(process.env.STAMP_INTRADAY_PCT || 0.00003)).toNumber()
    );
  }

  const gst = roundRupee(new Decimal(brokerage).add(exchangeTxn).mul(0.18).toNumber());
  const totalCharges = roundRupee(brokerage + stt + exchangeTxn + sebi + stampDuty + gst);

  const netAmount =
    params.side === 'BUY'
      ? roundRupee(turnover + totalCharges)
      : roundRupee(turnover - totalCharges);

  return { turnover, brokerage, stt, exchangeTxn, sebi, stampDuty, gst, totalCharges, netAmount };
  return {
    turnover,
    brokerage,
    stt,
    exchangeTxn,
    sebi,
    stampDuty,
    gst,
    totalCharges,
    netAmount,
    totalChargesPaise: toPaise(totalCharges),
    brokeragePaise: toPaise(brokerage),
    sttPaise: toPaise(stt),
    gstPaise: toPaise(gst),
  };
}
