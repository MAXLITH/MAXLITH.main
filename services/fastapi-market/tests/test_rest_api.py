import os
import sys
import pytest
from fastapi.testclient import TestClient

test_dir = os.path.dirname(os.path.abspath(__file__))
svc_dir = os.path.abspath(os.path.join(test_dir, ".."))
if svc_dir not in sys.path:
    sys.path.insert(0, svc_dir)

from src.main import app
from src.core.cache import quote_cache
from src.models.quote import DepthLevel, MarketDepth, NormalizedQuote


@pytest.fixture
def client():
    return TestClient(app)


def test_health_endpoints(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "upstoxConnected" in data

    res = client.get("/ready")
    assert res.status_code == 200
    assert res.json()["status"] == "ready"

    res = client.get("/live")
    assert res.status_code == 200
    assert res.json()["status"] == "live"


def test_instrument_search(client):
    res = client.get("/api/v1/instruments/search?q=RELIANCE")
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 1
    assert items[0]["symbol"] == "RELIANCE"
    assert items[0]["exchange"] == "NSE"


def test_get_instrument_by_key(client):
    res = client.get("/api/v1/instruments/NSE_EQ|INE002A01018")
    assert res.status_code == 200
    data = res.json()
    assert data["symbol"] == "RELIANCE"


@pytest.mark.asyncio
async def test_market_quotes_and_depth(client):
    # Seed cache
    depth = MarketDepth(
        bids=[DepthLevel(price=3849.0, quantity=50)],
        asks=[DepthLevel(price=3851.0, quantity=50)],
    )
    quote = NormalizedQuote(
        instrument_key="NSE_EQ|INE467B01029",
        symbol="TCS",
        exchange="NSE",
        name="Tata Consultancy Services Ltd",
        last_price=3850.0,
        previous_close=3800.0,
        change=50.0,
        change_percent=1.32,
        depth=depth,
        received_timestamp=1718000000000,
        is_stale=False,
    )
    await quote_cache.set_quote(quote)

    # Test quotes endpoint
    res = client.get("/api/v1/market/quotes?instruments=NSE:TCS")
    assert res.status_code == 200
    data = res.json()
    assert "quotes" in data
    assert "NSE:TCS" in data["quotes"]
    assert data["quotes"]["NSE:TCS"]["lastPrice"] == 3850.0

    # Test depth endpoint
    res = client.get("/api/v1/market/depth?symbol=NSE:TCS")
    assert res.status_code == 200
    depth_data = res.json()
    assert "depth" in depth_data
    assert len(depth_data["depth"]["bids"]) == 1
    assert depth_data["depth"]["bids"][0]["price"] == 3849.0


def test_market_status(client):
    res = client.get("/api/v1/market/status")
    assert res.status_code == 200
    data = res.json()
    assert "session" in data
    assert "is_open" in data

