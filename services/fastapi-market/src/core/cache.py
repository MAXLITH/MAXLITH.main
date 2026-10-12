import asyncio
import json
import logging
import time
from typing import Dict, List, Optional
from ..config import settings
from ..models.quote import MarketStatus, NormalizedQuote

logger = logging.getLogger(__name__)


class QuoteCache:
    """
    High-performance in-memory cache for market quotes with stale detection
    and optional Redis Pub/Sub event distribution.
    """

    def __init__(self):
        self._quotes: Dict[str, NormalizedQuote] = {}  # keyed by instrument_key
        self._key_by_symbol: Dict[str, str] = {}  # symbol / NSE:SYMBOL -> instrument_key
        self._lock = asyncio.Lock()
        self._market_status = MarketStatus()
        self._last_tick_time: float = 0.0
        self._tick_counter: int = 0
        self._reconnect_counter: int = 0
        self._is_upstream_connected: bool = False
        self._redis_client = None

    async def initialize(self) -> None:
        if settings.REDIS_URL:
            try:
                import redis.asyncio as aioredis
                self._redis_client = aioredis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=3.0,
                )
                await self._redis_client.ping()
                logger.info(f"Connected to Redis cache at {settings.REDIS_URL}")
            except Exception as e:
                logger.warning(f"Could not connect to Redis ({e}); falling back to local memory cache.")
                self._redis_client = None

    async def close(self) -> None:
        if self._redis_client:
            await self._redis_client.close()
            self._redis_client = None

    async def set_quote(self, quote: NormalizedQuote) -> None:
        async with self._lock:
            self._quotes[quote.instrument_key] = quote
            self._key_by_symbol[quote.symbol.upper()] = quote.instrument_key
            self._key_by_symbol[f"{quote.exchange}:{quote.symbol}".upper()] = quote.instrument_key
            self._last_tick_time = time.time()
            self._tick_counter += 1

        # Optional Redis caching and pub/sub
        if self._redis_client:
            try:
                payload = json.dumps(quote.to_snapshot_dict())
                await self._redis_client.set(
                    f"maxlith:quote:{quote.instrument_key}",
                    payload,
                    ex=int(settings.QUOTE_STALE_THRESHOLD_SECONDS * 2),
                )
                await self._redis_client.publish("maxlith:quotes:stream", payload)
            except Exception as e:
                logger.debug(f"Redis write error: {e}")

    async def get_quote(self, identifier: str) -> Optional[NormalizedQuote]:
        cleaned = identifier.strip().upper()
        async with self._lock:
            key = self._key_by_symbol.get(cleaned, cleaned)
            quote = self._quotes.get(key)
            if not quote:
                return None

            # Check freshness
            now_sec = time.time()
            age_sec = now_sec - (quote.received_timestamp / 1000.0)
            if age_sec > settings.QUOTE_STALE_THRESHOLD_SECONDS:
                quote = quote.model_copy(update={"is_stale": True})
            return quote

    async def get_quotes_batch(self, identifiers: List[str]) -> Dict[str, NormalizedQuote]:
        result = {}
        for ident in identifiers:
            q = await self.get_quote(ident)
            if q:
                result[ident] = q
        return result

    async def get_all_quotes(self) -> List[NormalizedQuote]:
        now_sec = time.time()
        async with self._lock:
            quotes_list = []
            for quote in self._quotes.values():
                age_sec = now_sec - (quote.received_timestamp / 1000.0)
                if age_sec > settings.QUOTE_STALE_THRESHOLD_SECONDS:
                    quotes_list.append(quote.model_copy(update={"is_stale": True}))
                else:
                    quotes_list.append(quote)
            return quotes_list

    def set_upstream_status(self, connected: bool) -> None:
        self._is_upstream_connected = connected
        if not connected:
            self._reconnect_counter += 1

    def set_market_status(self, status: MarketStatus) -> None:
        self._market_status = status

    def get_market_status(self) -> MarketStatus:
        return self._market_status

    def get_health_stats(self) -> dict:
        now_sec = time.time()
        time_since_last_tick = (now_sec - self._last_tick_time) if self._last_tick_time > 0 else None
        return {
            "upstreamConnected": self._is_upstream_connected,
            "cachedQuotesCount": len(self._quotes),
            "ticksReceivedTotal": self._tick_counter,
            "reconnectCount": self._reconnect_counter,
            "secondsSinceLastTick": round(time_since_last_tick, 2) if time_since_last_tick is not None else None,
            "feedFresh": bool(time_since_last_tick is not None and time_since_last_tick <= settings.QUOTE_STALE_THRESHOLD_SECONDS),
            "redisEnabled": bool(self._redis_client is not None),
        }


quote_cache = QuoteCache()

