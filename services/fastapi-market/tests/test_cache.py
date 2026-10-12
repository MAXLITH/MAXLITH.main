import os
import sys
import time
import pytest

test_dir = os.path.dirname(os.path.abspath(__file__))
svc_dir = os.path.abspath(os.path.join(test_dir, ".."))
if svc_dir not in sys.path:
    sys.path.insert(0, svc_dir)

from src.core.cache import QuoteCache
from src.models.quote import NormalizedQuote


@pytest.mark.asyncio
async def test_cache_set_and_get():
    cache = QuoteCache()
    now_ms = int(time.time() * 1000)

    quote = NormalizedQuote(
        instrument_key="NSE_EQ|INE002A01018",
        symbol="RELIANCE",
        exchange="NSE",
        name="Reliance Industries Ltd",
        last_price=2950.0,
        previous_close=2900.0,
        change=50.0,
        change_percent=1.72,
        received_timestamp=now_ms,
    )

    await cache.set_quote(quote)

    # Lookup by instrument_key
    q1 = await cache.get_quote("NSE_EQ|INE002A01018")
    assert q1 is not None
    assert q1.last_price == 2950.0
    assert q1.is_stale is False

    # Lookup by symbol
    q2 = await cache.get_quote("RELIANCE")
    assert q2 is not None
    assert q2.instrument_key == "NSE_EQ|INE002A01018"

    # Lookup by exchange:symbol
    q3 = await cache.get_quote("NSE:RELIANCE")
    assert q3 is not None
    assert q3.last_price == 2950.0


@pytest.mark.asyncio
async def test_cache_stale_detection():
    cache = QuoteCache()
    # Stale timestamp: 60 seconds ago
    stale_ms = int((time.time() - 60.0) * 1000)

    quote = NormalizedQuote(
        instrument_key="NSE_EQ|INE467B01029",
        symbol="TCS",
        exchange="NSE",
        name="Tata Consultancy Services Ltd",
        last_price=3850.0,
        previous_close=3800.0,
        received_timestamp=stale_ms,
    )
    await cache.set_quote(quote)

    q = await cache.get_quote("TCS")
    assert q is not None
    assert q.is_stale is True


@pytest.mark.asyncio
async def test_cache_health_stats():
    cache = QuoteCache()
    cache.set_upstream_status(True)
    stats = cache.get_health_stats()
    assert stats["upstreamConnected"] is True
    assert stats["cachedQuotesCount"] == 0

