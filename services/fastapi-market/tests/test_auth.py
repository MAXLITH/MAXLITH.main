import os
import sys
import time
import pytest
from jose import jwt

test_dir = os.path.dirname(os.path.abspath(__file__))
svc_dir = os.path.abspath(os.path.join(test_dir, ".."))
if svc_dir not in sys.path:
    sys.path.insert(0, svc_dir)

from src.config import settings
from src.core.auth import AuthError, verify_market_stream_token

TEST_SECRET = "test-secret-at-least-32-chars-long-1234567890"


@pytest.fixture(autouse=True)
def setup_auth_settings():
    orig_secret = settings.MARKET_STREAM_JWT_SECRET
    orig_dev = settings.MARKET_STREAM_DEV_AUTH
    settings.MARKET_STREAM_JWT_SECRET = TEST_SECRET
    settings.MARKET_STREAM_DEV_AUTH = False
    yield
    settings.MARKET_STREAM_JWT_SECRET = orig_secret
    settings.MARKET_STREAM_DEV_AUTH = orig_dev


def test_valid_jwt_token():
    payload = {
        "sub": "user-456",
        "scope": "market-stream",
        "iss": "maxlith-web",
        "aud": "market-stream",
        "exp": int(time.time()) + 300,
    }
    token = jwt.encode(payload, TEST_SECRET, algorithm="HS256")
    user_id = verify_market_stream_token(token)
    assert user_id == "user-456"


def test_expired_jwt_token():
    payload = {
        "sub": "user-456",
        "scope": "market-stream",
        "iss": "maxlith-web",
        "aud": "market-stream",
        "exp": int(time.time()) - 10,
    }
    token = jwt.encode(payload, TEST_SECRET, algorithm="HS256")
    with pytest.raises(AuthError):
        verify_market_stream_token(token)


def test_invalid_issuer_or_audience():
    payload = {
        "sub": "user-456",
        "scope": "market-stream",
        "iss": "wrong-issuer",
        "aud": "market-stream",
        "exp": int(time.time()) + 300,
    }
    token = jwt.encode(payload, TEST_SECRET, algorithm="HS256")
    with pytest.raises(AuthError):
        verify_market_stream_token(token)


def test_dev_mode_bypass():
    settings.MARKET_STREAM_DEV_AUTH = True
    user_id = verify_market_stream_token("dev")
    assert user_id == "dev-user"

