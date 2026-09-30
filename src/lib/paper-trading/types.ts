import { ChargeBreakdown, ProductType } from '../charges';

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'SL' | 'SL-M';
export type OrderStatus = 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'REJECTED' | 'AMO';

export interface OrderRequest {
  userId: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  productType?: ProductType;
  quantity: number;
  price?: number;
  triggerPrice?: number;
  idempotencyKey?: string;
}

export interface OrderPreviewResult {
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  productType: ProductType;
  quantity: number;
  price: number;
  turnover: number;
  marginRequired: number;
  availableCash: number;
  hasSufficientFunds: boolean;
  charges: ChargeBreakdown;
  netEstimatedTotal: number;
  warning?: string | null;
}

export interface PositionRecord {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  product_type: ProductType;
  quantity: number;
  average_price: number;
  current_price: number;
  previous_close: number;
  invested_value: number;
  current_value: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  day_pnl: number;
  day_pnl_percent: number;
  realized_pnl: number;
  sector?: string;
}

export interface TradeRecord {
  id: string;
  order_id: string;
  user_id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  charges_json?: string;
  created_at: string;
}

export interface PortfolioSummary {
  userId: string;
  virtualCash: number;
  availableCash: number;
  blockedMargin: number;
  initialCapital: number;
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
  sectorAllocations: { sector: string; value: number; percentage: number }[];
}
