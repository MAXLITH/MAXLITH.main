import logging
import time
from typing import Literal, Optional
from pydantic import BaseModel, Field

from ..config import settings
from ..core.cache import quote_cache
from ..core.instrument_master import instrument_master
from ..models.quote import NormalizedQuote

logger = logging.getLogger(__name__)


class OrderValidationRequest(BaseModel):
    symbol: str  # e.g. "NSE:RELIANCE" or "RELIANCE"
    side: Literal["BUY", "SELL"]
    order_type: Literal["MARKET", "LIMIT", "STOP_LOSS"] = "MARKET"
    quantity: int = Field(gt=0)
    limit_price: Optional[float] = None
    trigger_price: Optional[float] = None
    slippage_bps: float = 5.0  # 5 basis points (0.05%) default slippage simulation


class OrderValidationResult(BaseModel):
    valid: bool
    status: Literal["EXECUTABLE", "PENDING", "REJECTED"]
    fill_price: Optional[float] = None
    quote_last: Optional[float] = None
    quote_bid: Optional[float] = None
    quote_ask: Optional[float] = None
    quote_time: Optional[int] = None
    is_stale: bool = False
    message: str


class PaperOrderValidator:
    """
    Validates paper trading orders against authenticated server-side market quotes.
    Prevents client-side price tampering and simulates realistic execution
    based on live bid/ask spreads, market depth, and price conditions.
    """

    @staticmethod
    async def validate_order(req: OrderValidationRequest) -> OrderValidationResult:
        key = instrument_master.resolve_instrument_key(req.symbol)
        if not key:
            return OrderValidationResult(
                valid=False,
                status="REJECTED",
                message=f"Unknown or unsupported instrument: {req.symbol}",
            )

        quote = await quote_cache.get_quote(key)
        if not quote or quote.last_price <= 0:
            return OrderValidationResult(
                valid=False,
                status="REJECTED",
                message=f"Live quote currently unavailable for {req.symbol}.",
            )

        if quote.is_stale:
            return OrderValidationResult(
                valid=False,
                status="REJECTED",
                is_stale=True,
                message=f"Market data for {req.symbol} is stale. Order execution prevented.",
            )

        best_bid = quote.depth.bids[0].price if (quote.depth and quote.depth.bids) else quote.last_price
        best_ask = quote.depth.asks[0].price if (quote.depth and quote.depth.asks) else quote.last_price

        # MARKET ORDER EXECUTION
        if req.order_type == "MARKET":
            base_price = best_ask if req.side == "BUY" else best_bid
            # Apply simulated slippage
            slippage_factor = 1.0 + (req.slippage_bps / 10000.0) if req.side == "BUY" else 1.0 - (req.slippage_bps / 10000.0)
            fill_price = round(base_price * slippage_factor, 2)

            return OrderValidationResult(
                valid=True,
                status="EXECUTABLE",
                fill_price=fill_price,
                quote_last=quote.last_price,
                quote_bid=best_bid,
                quote_ask=best_ask,
                quote_time=quote.last_trade_timestamp or quote.received_timestamp,
                is_stale=False,
                message="Market order validated against server-side quote with spread and slippage.",
            )

        # LIMIT ORDER EXECUTION
        elif req.order_type == "LIMIT":
            if req.limit_price is None or req.limit_price <= 0:
                return OrderValidationResult(
                    valid=False,
                    status="REJECTED",
                    message="Limit price must be specified and greater than zero.",
                )

            # BUY LIMIT executes if market price <= limit_price
            if req.side == "BUY":
                if best_ask <= req.limit_price:
                    fill_price = round(min(best_ask, req.limit_price), 2)
                    return OrderValidationResult(
                        valid=True,
                        status="EXECUTABLE",
                        fill_price=fill_price,
                        quote_last=quote.last_price,
                        quote_bid=best_bid,
                        quote_ask=best_ask,
                        quote_time=quote.last_trade_timestamp or quote.received_timestamp,
                        message=f"Buy limit price of {req.limit_price} satisfied by market ask {best_ask}.",
                    )
                else:
                    return OrderValidationResult(
                        valid=True,
                        status="PENDING",
                        quote_last=quote.last_price,
                        quote_bid=best_bid,
                        quote_ask=best_ask,
                        quote_time=quote.last_trade_timestamp or quote.received_timestamp,
                        message=f"Buy limit price {req.limit_price} below current ask {best_ask}; order pending.",
                    )

            # SELL LIMIT executes if market price >= limit_price
            else:
                if best_bid >= req.limit_price:
                    fill_price = round(max(best_bid, req.limit_price), 2)
                    return OrderValidationResult(
                        valid=True,
                        status="EXECUTABLE",
                        fill_price=fill_price,
                        quote_last=quote.last_price,
                        quote_bid=best_bid,
                        quote_ask=best_ask,
                        quote_time=quote.last_trade_timestamp or quote.received_timestamp,
                        message=f"Sell limit price of {req.limit_price} satisfied by market bid {best_bid}.",
                    )
                else:
                    return OrderValidationResult(
                        valid=True,
                        status="PENDING",
                        quote_last=quote.last_price,
                        quote_bid=best_bid,
                        quote_ask=best_ask,
                        quote_time=quote.last_trade_timestamp or quote.received_timestamp,
                        message=f"Sell limit price {req.limit_price} above current bid {best_bid}; order pending.",
                    )

        # STOP LOSS
        elif req.order_type == "STOP_LOSS":
            if req.trigger_price is None or req.trigger_price <= 0:
                return OrderValidationResult(
                    valid=False,
                    status="REJECTED",
                    message="Trigger price required for stop loss order.",
                )

            # Buy Stop Loss triggers when price rises to/above trigger
            # Sell Stop Loss triggers when price falls to/below trigger
            triggered = (quote.last_price >= req.trigger_price) if req.side == "BUY" else (quote.last_price <= req.trigger_price)
            if triggered:
                fill_price = round(quote.last_price, 2)
                return OrderValidationResult(
                    valid=True,
                    status="EXECUTABLE",
                    fill_price=fill_price,
                    quote_last=quote.last_price,
                    quote_bid=best_bid,
                    quote_ask=best_ask,
                    quote_time=quote.last_trade_timestamp or quote.received_timestamp,
                    message=f"Stop loss triggered at {quote.last_price}.",
                )
            else:
                return OrderValidationResult(
                    valid=True,
                    status="PENDING",
                    quote_last=quote.last_price,
                    quote_bid=best_bid,
                    quote_ask=best_ask,
                    quote_time=quote.last_trade_timestamp or quote.received_timestamp,
                    message=f"Stop loss trigger {req.trigger_price} not yet reached.",
                )

        return OrderValidationResult(
            valid=False,
            status="REJECTED",
            message=f"Unsupported order type: {req.order_type}",
        )

