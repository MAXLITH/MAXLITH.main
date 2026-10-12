import os
import sys
import time
import pytest
from fastapi.testclient import TestClient
from jose import jwt

test_dir = os.path.dirname(os.path.abspath(__file__))
svc_dir = os.path.abspath(os.path.join(test_dir, ".."))
if svc_dir not in sys.path:
    sys.path.insert(0, svc_dir)

from src.main import app
from src.config import settings
from src.core.cache import quote_cache
from src.models.quote import NormalizedQuote

TEST_SECRET = "test-secret-at-least-32-chars-long-1234567890"


@pytest.fixture(autouse=True)
def setup_auth_settings():
    orig_secret = settings.MARKET_STREAM_JWT_SECRET
    settings.MARKET_STREAM_JWT_SECRET = TEST_SECRET
    yield
    settings.MARKET_STREAM_JWT_SECRET = orig_secret


def make_test_token(user_id="user-123"):
    payload = {
        "sub": user_id,
        "scope": "market-stream",
        "iss": "maxlith-web",
        "aud": "market-stream",
        "exp": int(time.time()) + 300,
    }
    return jwt.encode(payload, TEST_SECRET, algorithm="HS256")


def test_ws_connect_unauthorized():
    client = TestClient(app)
    with pytest.raises(Exception):
        with client.websocket_connect("/ws/market"):
            pass


def test_ws_ping_pong():
    client = TestClient(app)
    token = make_test_token()
    with client.websocket_connect(f"/ws/market?token={token}") as ws:
        # First message is connection_status
        init_msg = ws.receive_json()
        assert init_msg["type"] == "connection_status"

        # Send ping
        ws.send_json({"action": "ping"})
        pong_msg = ws.receive_json()
        assert pong_msg["type"] == "pong"


@pytest.mark.asyncio
async def test_ws_subscribe_and_cached_snapshot():
    # Seed quote in cache
    quote = NormalizedQuote(
        instrument_key="NSE_EQ|INE002A01018",
        symbol="RELIANCE",
        exchange="NSE",
        name="Reliance Industries Ltd",
        last_price=2950.5,
        previous_close=2900.0,
        change=50.5,
        change_percent=1.74,
        received_timestamp=int(time.time() * 1000),
        is_stale=False,
    )
    await quote_cache.set_quote(quote)

    client = TestClient(app)
    token = make_test_token()
    with client.websocket_connect(f"/ws/market?token={token}") as ws:
        # Initial status
        init_msg = ws.receive_json()
        assert init_msg["type"] == "connection_status"

        # Subscribe to RELIANCE
        ws.send_json({"action": "subscribe", "symbol": "NSE:RELIANCE", "resolution": "1D"})

        # Should receive immediate cached quote_update
        quote_msg = ws.receive_json()
        assert quote_msg["type"] == "quote_update"
        assert quote_msg["symbol"] == "NSE:RELIANCE"
        assert quote_msg["data"]["last"] == 2950.5

        # Bar update
        bar_msg = ws.receive_json()
        assert bar_msg["type"] == "bar_update"
        assert bar_msg["symbol"] == "NSE:RELIANCE"
        assert bar_msg["data"]["close"] == 2950.5

