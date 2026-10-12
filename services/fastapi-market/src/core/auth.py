import logging
from typing import Optional
from jose import JWTError, jwt
from ..config import settings

logger = logging.getLogger(__name__)


class AuthError(Exception):
    def __init__(self, message: str, status_code: int = 401):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def verify_market_stream_token(token: Optional[str]) -> str:
    """
    Validates a JWT token for the market-stream gateway.
    Tokens are minted by Next.js (/api/market/stream-token) with:
    - alg: HS256
    - iss: maxlith-web
    - aud: market-stream
    - scope: market-stream
    - sub: userId

    Returns:
        userId: The authenticated user's ID.
    Raises:
        AuthError if token is missing or invalid.
    """
    # Development bypass if enabled
    if settings.MARKET_STREAM_DEV_AUTH:
        if not token or token in ("dev", "test-token", "anonymous"):
            return "dev-user"

    if not token:
        raise AuthError("Token required", 401)

    secret = settings.MARKET_STREAM_JWT_SECRET
    if not secret or len(secret) < 32:
        # If secret is unconfigured in development, allow dev session if dev auth flag set
        if settings.MARKET_STREAM_DEV_AUTH or settings.ENVIRONMENT == "development":
            logger.warning("MARKET_STREAM_JWT_SECRET is unset; falling back to dev user in dev mode.")
            return "dev-user"
        raise AuthError("Market streaming authentication is not properly configured.", 503)

    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            issuer="maxlith-web",
            audience="market-stream",
        )
    except JWTError as err:
        logger.warning(f"JWT verification failed: {err}")
        raise AuthError("Invalid or expired stream token", 401)

    user_id = payload.get("sub")
    scope = payload.get("scope")

    if not user_id or not isinstance(user_id, str):
        raise AuthError("Invalid stream token payload: missing subject", 401)

    if scope != "market-stream":
        raise AuthError("Invalid stream token payload: invalid scope", 401)

    return user_id

