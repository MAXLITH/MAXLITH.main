from datetime import datetime, timezone
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class DepthLevel(BaseModel):
    price: float
    quantity: int
    orders: Optional[int] = 0


class MarketDepth(BaseModel):
    bids: List[DepthLevel] = Field(default_factory=list)
    asks: List[DepthLevel] = Field(default_factory=list)


class OHLCBar(BaseModel):
    time: int  # epoch milliseconds
    open: float
    high: float
    low: float
    close: float
    volume: int
    interval: Optional[str] = "1D"


class NormalizedQuote(BaseModel):
    instrument_key: str
    symbol: str
    exchange: str
    name: Optional[str] = None
    last_price: float
    previous_close: float = 0.0
    change: float = 0.0
    change_percent: float = 0.0
    open_price: Optional[float] = None
    high_price: Optional[float] = None
    low_price: Optional[float] = None
    volume: int = 0
    last_traded_quantity: Optional[int] = None
    last_trade_timestamp: Optional[int] = None  # epoch ms
    average_traded_price: Optional[float] = None
    open_interest: Optional[float] = None
    total_buy_quantity: Optional[float] = None
    total_sell_quantity: Optional[float] = None
    depth: Optional[MarketDepth] = None
    provider_timestamp: Optional[int] = None  # epoch ms
    received_timestamp: int  # epoch ms
    feed_mode: str = "full"  # "ltpc" or "full"
    is_stale: bool = False
    source: str = "UPSTOX_V3"

    def to_frontend_quote_dict(self) -> dict:
        """
        Formats into the exact contract expected by MAXLITH frontend's
        quote_update message payload:
        { last, change, changePercent, open, high, low, previousClose, volume, delaySeconds, asOf, source }
        """
        as_of_iso = (
            datetime.fromtimestamp(
                (self.last_trade_timestamp or self.received_timestamp) / 1000.0,
                tz=timezone.utc,
            ).isoformat()
        )
        return {
            "last": round(self.last_price, 2),
            "change": round(self.change, 2),
            "changePercent": round(self.change_percent, 2),
            "open": round(self.open_price if self.open_price is not None else self.last_price, 2),
            "high": round(self.high_price if self.high_price is not None else self.last_price, 2),
            "low": round(self.low_price if self.low_price is not None else self.last_price, 2),
            "previousClose": round(self.previous_close if self.previous_close > 0 else self.last_price, 2),
            "volume": int(self.volume),
            "delaySeconds": 0,
            "asOf": as_of_iso,
            "source": self.source,
        }

    def to_snapshot_dict(self) -> dict:
        """Full rich JSON snapshot for REST APIs and market.snapshot events."""
        return {
            "instrumentKey": self.instrument_key,
            "symbol": self.symbol,
            "exchange": self.exchange,
            "name": self.name or self.symbol,
            "lastPrice": round(self.last_price, 2),
            "previousClose": round(self.previous_close, 2),
            "change": round(self.change, 2),
            "changePercent": round(self.change_percent, 2),
            "open": round(self.open_price or self.last_price, 2),
            "high": round(self.high_price or self.last_price, 2),
            "low": round(self.low_price or self.last_price, 2),
            "volume": self.volume,
            "atp": round(self.average_traded_price, 2) if self.average_traded_price else None,
            "depth": self.depth.model_dump() if self.depth else {"bids": [], "asks": []},
            "feedMode": self.feed_mode,
            "isStale": self.is_stale,
            "source": self.source,
            "lastTradeTime": self.last_trade_timestamp,
            "receivedAt": self.received_timestamp,
        }


class MarketStatus(BaseModel):
    session: str = "OPEN"  # PRE_MARKET, OPEN, POST_MARKET, CLOSED, UNKNOWN
    is_open: bool = True
    timezone: str = "Asia/Kolkata"
    segment_status: Dict[str, str] = Field(default_factory=dict)
    last_updated: Optional[str] = None

