import os
import sys
import time
import pytest

test_dir = os.path.dirname(os.path.abspath(__file__))
svc_dir = os.path.abspath(os.path.join(test_dir, ".."))
if svc_dir not in sys.path:
    sys.path.insert(0, svc_dir)

from src.core.cache import quote_cache
from src.engine.paper_validator import (
    OrderValidationRequest,
    PaperOrderValidator,
)
from src.models.quote import DepthLevel, MarketDepth, NormalizedQuote


async def seed_test_quote():
    now_ms = int(time.time() * 1000)
    depth = MarketDepth(
        bids=[DepthLevel(price=2950.0, quantity=100)],
        asks=[DepthLevel(price=2951.0, quantity=100)],
    )
    quote = NormalizedQuote(
        instrument_key="NSE_EQ|INE002A01018",
        symbol="RELIANCE",
        exchange="NSE",
        name="Reliance Industries Ltd",
        last_price=2950.5,
        previous_close=2900.0,
        depth=depth,
        received_timestamp=now_ms,
        is_stale=False,
    )
    await quote_cache.set_quote(quote)


@pytest.mark.asyncio
async def test_market_buy_validation():
    await seed_test_quote()
    req = OrderValidationRequest(
        symbol="NSE:RELIANCE",
        side="BUY",
        order_type="MARKET",
        quantity=10,
        slippage_bps=5.0,  # 0.05%
    )
    res = await PaperOrderValidator.validate_order(req)
    assert res.valid is True
    assert res.status == "EXECUTABLE"
    assert res.fill_price is not None
    # Best ask is 2951.0 -> 2951 * 1.0005 = 2952.48
    assert res.fill_price >= 2951.0
    assert res.is_stale is False


@pytest.mark.asyncio
async def test_limit_buy_validation_executable():
    await seed_test_quote()
    # Limit price 2955 is higher than current ask 2951 -> Executable!
    req = OrderValidationRequest(
        symbol="NSE:RELIANCE",
        side="BUY",
        order_type="LIMIT",
        quantity=5,
        limit_price=2955.0,
    )
    res = await PaperOrderValidator.validate_order(req)
    assert res.valid is True
    assert res.status == "EXECUTABLE"
    assert res.fill_price == 2951.0  # fills at best market ask price


@pytest.mark.asyncio
async def test_limit_buy_validation_pending():
    await seed_test_quote()
    # Limit price 2940 is lower than current ask 2951 -> Pending!
    req = OrderValidationRequest(
        symbol="NSE:RELIANCE",
        side="BUY",
        order_type="LIMIT",
        quantity=5,
        limit_price=2940.0,
    )
    res = await PaperOrderValidator.validate_order(req)
    assert res.valid is True
    assert res.status == "PENDING"
    assert res.fill_price is None


@pytest.mark.asyncio
async def test_stale_quote_rejection():
    # Mark quote stale
    stale_quote = NormalizedQuote(
        instrument_key="NSE_EQ|INE002A01018",
        symbol="RELIANCE",
        exchange="NSE",
        name="Reliance Industries Ltd",
        last_price=2950.5,
        received_timestamp=int((time.time() - 100) * 1000),
        is_stale=True,
    )
    await quote_cache.set_quote(stale_quote)

    req = OrderValidationRequest(
        symbol="NSE:RELIANCE",
        side="BUY",
        order_type="MARKET",
        quantity=10,
    )
    res = await PaperOrderValidator.validate_order(req)
    assert res.valid is False
    assert res.status == "REJECTED"
    assert "stale" in res.message.lower()

