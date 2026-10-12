import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = Field(default_factory=lambda: int(os.getenv("PORT", "4100")))
    ENVIRONMENT: str = "production"
    LOG_LEVEL: str = "INFO"

    # Upstox V3 Market Data Feed Credentials & Endpoints
    UPSTOX_ACCESS_TOKEN: str = ""
    UPSTOX_API_KEY: str = ""
    UPSTOX_API_SECRET: str = ""
    UPSTOX_FEED_MODE: str = "full"  # "ltpc" or "full"
    UPSTOX_AUTH_URL: str = "https://api.upstox.com/v3/feed/market-data-feed/authorize"
    UPSTOX_HISTORICAL_URL: str = "https://api.upstox.com/v2/historical-candle"
    UPSTOX_QUOTES_URL: str = "https://api.upstox.com/v2/market-quote/quotes"

    # Client WebSocket Gateway & JWT Authentication
    MARKET_STREAM_JWT_SECRET: str = ""
    MARKET_STREAM_DEV_AUTH: bool = False
    MAX_CONNECTIONS_PER_USER: int = 5
    MAX_SUBSCRIPTIONS_PER_CLIENT: int = 50
    HEARTBEAT_INTERVAL_SECONDS: float = 25.0
    CLIENT_PING_TIMEOUT_SECONDS: float = 60.0

    # CORS and Allowed Origins
    MAXLITH_ALLOWED_ORIGINS: str = ""

    # Quote Cache and Freshness
    QUOTE_STALE_THRESHOLD_SECONDS: float = 30.0
    DEFAULT_WATCHLIST: str = (
        "NSE_INDEX|Nifty 50,NSE_INDEX|Nifty Bank,NSE_EQ|INE002A01018,"
        "NSE_EQ|INE467B01029,NSE_EQ|INE009A01021,NSE_EQ|INE040A01034"
    )

    # Optional Redis
    REDIS_URL: Optional[str] = None

    @property
    def allowed_origins_list(self) -> List[str]:
        if not self.MAXLITH_ALLOWED_ORIGINS or self.MAXLITH_ALLOWED_ORIGINS.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.MAXLITH_ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def is_upstox_configured(self) -> bool:
        return bool(self.UPSTOX_ACCESS_TOKEN and len(self.UPSTOX_ACCESS_TOKEN.strip()) > 10)


settings = Settings()

