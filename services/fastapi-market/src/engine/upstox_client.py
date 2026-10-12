import asyncio
import json
import logging
import random
import ssl
from typing import Callable, Coroutine, Dict, List, Optional, Set
import httpx
import websockets
from websockets.exceptions import ConnectionClosed

from ..config import settings
from ..core.cache import quote_cache
from ..core.instrument_master import instrument_master
from ..core.quote_normalizer import QuoteNormalizer
from ..models.quote import MarketStatus, NormalizedQuote

logger = logging.getLogger(__name__)


class UpstoxFeedClient:
    """
    Official Upstox Market Data Feed V3 Client.
    Maintains a single resilient upstream WebSocket connection, decodes
    incoming Protobuf binary messages, updates the local cache, and
    notifies listeners.
    """

    def __init__(self, on_quote_update: Optional[Callable[[NormalizedQuote], Coroutine]] = None):
        self._on_quote_update = on_quote_update
        self._active_instruments: Set[str] = set()
        self._mode: str = settings.UPSTOX_FEED_MODE
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self._running: bool = False
        self._task: Optional[asyncio.Task] = None
        self._reconnect_attempts: int = 0
        self._ssl_context = ssl.create_default_context()
        self._subscribed_upstream: Set[str] = set()

        # Load default instruments from settings
        for key in settings.DEFAULT_WATCHLIST.split(","):
            cleaned = key.strip()
            if cleaned:
                self._active_instruments.add(cleaned)

    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._run_loop(), name="upstox_feed_client")
        logger.info("Upstox Feed Client background task started.")

    async def stop(self) -> None:
        self._running = False
        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass
            self._ws = None
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        quote_cache.set_upstream_status(False)
        logger.info("Upstox Feed Client stopped.")

    async def subscribe_instruments(self, instrument_keys: List[str], mode: Optional[str] = None) -> None:
        new_keys = []
        for key in instrument_keys:
            if key and key not in self._active_instruments:
                self._active_instruments.add(key)
                new_keys.append(key)
            elif key and key not in self._subscribed_upstream:
                new_keys.append(key)

        if new_keys and self._ws and self._ws.open:
            await self._send_subscription(new_keys, mode or self._mode)

    async def unsubscribe_instruments(self, instrument_keys: List[str]) -> None:
        keys_to_unsub = []
        for key in instrument_keys:
            if key in self._active_instruments:
                self._active_instruments.remove(key)
            if key in self._subscribed_upstream:
                keys_to_unsub.append(key)
                self._subscribed_upstream.remove(key)

        if keys_to_unsub and self._ws and self._ws.open:
            await self._send_unsubscription(keys_to_unsub)

    async def _fetch_authorized_url(self) -> Optional[str]:
        """Requests authorized WebSocket URL from Upstox API V3."""
        if not settings.is_upstox_configured:
            logger.warning("Upstox access token not configured; upstream streaming disabled.")
            return None

        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {settings.UPSTOX_ACCESS_TOKEN}",
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(settings.UPSTOX_AUTH_URL, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    # Upstox returns authorized_redirect_uri or authorizedRedirectUri
                    redirect_uri = (
                        data.get("data", {}).get("authorized_redirect_uri")
                        or data.get("data", {}).get("authorizedRedirectUri")
                    )
                    if redirect_uri:
                        logger.info("Upstox feed authorization successful.")
                        return redirect_uri
                    logger.error(f"Upstox authorization returned unexpected body: {data}")
                else:
                    logger.error(f"Upstox authorization failed: {res.status_code} - {res.text}")
        except Exception as e:
            logger.error(f"Exception during Upstox authorization: {e}")
        return None

    async def _run_loop(self) -> None:
        while self._running:
            if not settings.is_upstox_configured:
                quote_cache.set_upstream_status(False)
                # Check periodically if credentials became available
                await asyncio.sleep(15.0)
                continue

            try:
                auth_url = await self._fetch_authorized_url()
                if not auth_url:
                    await self._handle_backoff("Failed to get authorized WebSocket URL")
                    continue

                logger.info(f"Connecting to Upstox WebSocket feed (attempt {self._reconnect_attempts + 1})...")
                async with websockets.connect(
                    auth_url,
                    ssl=self._ssl_context,
                    ping_interval=20,
                    ping_timeout=20,
                    max_size=4 * 1024 * 1024,
                ) as ws:
                    self._ws = ws
                    self._reconnect_attempts = 0
                    self._subscribed_upstream.clear()
                    quote_cache.set_upstream_status(True)
                    logger.info("Successfully connected to Upstox V3 Market Data Feed.")

                    # Resubscribe all active instruments
                    if self._active_instruments:
                        await self._send_subscription(list(self._active_instruments), self._mode)

                    # Message ingestion loop
                    while self._running:
                        message = await ws.recv()
                        if isinstance(message, bytes):
                            await self._handle_binary_message(message)
                        elif isinstance(message, str):
                            # Upstox occasionally sends text ping/pong/ack
                            logger.debug(f"Upstox text frame: {message}")

            except (ConnectionClosed, asyncio.TimeoutError) as e:
                logger.warning(f"Upstox WebSocket disconnected: {e}")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Unexpected error in Upstox feed loop: {e}", exc_info=True)
            finally:
                quote_cache.set_upstream_status(False)
                self._ws = None

            if self._running:
                await self._handle_backoff("Connection closed")

    async def _handle_backoff(self, reason: str) -> None:
        self._reconnect_attempts += 1
        base_delay = min(30.0, 1.0 * (2 ** min(self._reconnect_attempts, 5)))
        jitter = random.uniform(0.1, 1.5)
        delay = base_delay + jitter
        logger.info(f"{reason}. Reconnecting in {delay:.2f} seconds...")
        await asyncio.sleep(delay)

    async def _send_subscription(self, keys: List[str], mode: str) -> None:
        if not self._ws or not self._ws.open or not keys:
            return
        payload = {
            "guid": f"maxlith_sub_{int(random.random() * 10000)}",
            "method": "sub",
            "data": {
                "mode": mode,
                "instrumentKeys": keys,
            },
        }
        await self._ws.send(json.dumps(payload))
        self._subscribed_upstream.update(keys)
        logger.info(f"Subscribed upstream to {len(keys)} instruments in mode '{mode}'.")

    async def _send_unsubscription(self, keys: List[str]) -> None:
        if not self._ws or not self._ws.open or not keys:
            return
        payload = {
            "guid": f"maxlith_unsub_{int(random.random() * 10000)}",
            "method": "unsub",
            "data": {
                "mode": self._mode,
                "instrumentKeys": keys,
            },
        }
        await self._ws.send(json.dumps(payload))
        logger.info(f"Unsubscribed upstream from {len(keys)} instruments.")

    async def _handle_binary_message(self, raw_bytes: bytes) -> None:
        try:
            feed_response = QuoteNormalizer.decode_protobuf(raw_bytes)
            current_ts = feed_response.currentTs

            # Update segment status if marketInfo present
            if feed_response.HasField("marketInfo"):
                seg_dict = {}
                for seg, stat in feed_response.marketInfo.segmentStatus.items():
                    seg_dict[seg] = str(stat)
                quote_cache.set_market_status(
                    MarketStatus(
                        session="OPEN" if any("OPEN" in s for s in seg_dict.values()) else "CLOSED",
                        is_open=any("OPEN" in s for s in seg_dict.values()),
                        segment_status=seg_dict,
                    )
                )

            # Process individual feeds
            for instrument_key, feed in feed_response.feeds.items():
                prev_quote = await quote_cache.get_quote(instrument_key)
                norm_quote = QuoteNormalizer.normalize_feed(
                    instrument_key=instrument_key,
                    feed=feed,
                    current_ts=current_ts,
                    previous_quote=prev_quote,
                )
                if norm_quote:
                    await quote_cache.set_quote(norm_quote)
                    if self._on_quote_update:
                        try:
                            await self._on_quote_update(norm_quote)
                        except Exception as e:
                            logger.error(f"Error in quote update callback: {e}")

        except Exception as e:
            logger.error(f"Failed to decode binary Protobuf feed frame: {e}")

