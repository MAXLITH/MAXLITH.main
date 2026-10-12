import asyncio
import json
import logging
from typing import Dict, Optional, Set
from fastapi import WebSocket, WebSocketDisconnect

from ..config import settings
from ..core.cache import quote_cache
from ..core.instrument_master import instrument_master
from ..models.quote import NormalizedQuote

logger = logging.getLogger(__name__)


class ClientSession:
    def __init__(self, websocket: WebSocket, user_id: str):
        self.websocket = websocket
        self.user_id = user_id
        self.subscriptions: Set[str] = set()  # stores normalized symbol strings like "NSE:RELIANCE:1D"
        self.subscribed_keys: Set[str] = set()  # stores instrument keys like "NSE_EQ|INE002A01018"
        self.queue: asyncio.Queue = asyncio.Queue(maxsize=200)
        self.send_task: Optional[asyncio.Task] = None
        self.is_alive = True


class ConnectionManager:
    """
    Manages active frontend WebSocket sessions, client subscriptions,
    bounded write queues, and fan-out quote broadcast.
    """

    def __init__(self):
        self._sessions: Dict[WebSocket, ClientSession] = {}
        self._user_connection_count: Dict[str, int] = {}
        self._instrument_to_sessions: Dict[str, Set[ClientSession]] = {}
        self._upstox_client = None
        self._lock = asyncio.Lock()

    def set_upstox_client(self, client) -> None:
        self._upstox_client = client

    async def register(self, websocket: WebSocket, user_id: str) -> ClientSession:
        async with self._lock:
            current_count = self._user_connection_count.get(user_id, 0)
            if current_count >= settings.MAX_CONNECTIONS_PER_USER:
                await websocket.close(code=4029, reason="Connection limit reached")
                raise ValueError("User connection limit reached")

            session = ClientSession(websocket, user_id)
            self._sessions[websocket] = session
            self._user_connection_count[user_id] = current_count + 1
            session.send_task = asyncio.create_task(self._session_writer(session))

            # Send initial connection status
            upstream_live = quote_cache.get_health_stats()["upstreamConnected"]
            await self._send_direct(websocket, {
                "type": "connection_status",
                "status": "LIVE" if upstream_live else "RECONNECTING",
            })
            return session

    async def unregister(self, websocket: WebSocket) -> None:
        async with self._lock:
            session = self._sessions.pop(websocket, None)
            if not session:
                return

            session.is_alive = False
            if session.send_task:
                session.send_task.cancel()

            # Decrement user connection count
            user_id = session.user_id
            curr = self._user_connection_count.get(user_id, 1)
            if curr <= 1:
                self._user_connection_count.pop(user_id, None)
            else:
                self._user_connection_count[user_id] = curr - 1

            # Remove from all instrument subscriptions
            unsub_keys = []
            for key in list(session.subscribed_keys):
                sessions_set = self._instrument_to_sessions.get(key)
                if sessions_set:
                    sessions_set.discard(session)
                    if not sessions_set:
                        self._instrument_to_sessions.pop(key, None)
                        unsub_keys.append(key)

            # If upstream client is available, release unneeded instruments
            if unsub_keys and self._upstox_client:
                default_keys = set(settings.DEFAULT_WATCHLIST.split(","))
                keys_to_release = [k for k in unsub_keys if k not in default_keys]
                if keys_to_release:
                    asyncio.create_task(self._upstox_client.unsubscribe_instruments(keys_to_release))

    async def handle_subscribe(
        self,
        session: ClientSession,
        raw_symbol: str,
        resolution: str = "1D",
        mode: str = "full",
    ) -> None:
        if len(session.subscriptions) >= settings.MAX_SUBSCRIPTIONS_PER_CLIENT:
            await self.send_to_session(session, {
                "type": "error",
                "message": "Subscription limit reached",
            })
            return

        instrument_key = instrument_master.resolve_instrument_key(raw_symbol)
        if not instrument_key:
            await self.send_to_session(session, {
                "type": "error",
                "message": f"Unsupported or invalid symbol: {raw_symbol}",
            })
            return

        item = instrument_master.get_by_key(instrument_key)
        display_symbol = item.display_symbol if item else raw_symbol.upper()
        sub_key = f"{display_symbol}:{resolution}"

        async with self._lock:
            session.subscriptions.add(sub_key)
            session.subscribed_keys.add(instrument_key)

            if instrument_key not in self._instrument_to_sessions:
                self._instrument_to_sessions[instrument_key] = set()
            self._instrument_to_sessions[instrument_key].add(session)

        # Notify upstream client to track this instrument
        if self._upstox_client:
            await self._upstox_client.subscribe_instruments([instrument_key], mode=mode)

        # Send immediate cached snapshot if available
        cached_quote = await quote_cache.get_quote(instrument_key)
        if cached_quote:
            await self.send_to_session(session, {
                "type": "quote_update",
                "symbol": display_symbol,
                "data": cached_quote.to_frontend_quote_dict(),
            })
            if cached_quote.depth:
                await self.send_to_session(session, {
                    "type": "orderbook_update",
                    "symbol": display_symbol,
                    "data": cached_quote.depth.model_dump(),
                })
            await self.send_to_session(session, {
                "type": "bar_update",
                "symbol": display_symbol,
                "data": {
                    "time": cached_quote.provider_timestamp or cached_quote.received_timestamp,
                    "open": cached_quote.open_price or cached_quote.last_price,
                    "high": cached_quote.high_price or cached_quote.last_price,
                    "low": cached_quote.low_price or cached_quote.last_price,
                    "close": cached_quote.last_price,
                    "volume": cached_quote.volume,
                    "resolution": resolution,
                },
            })

        await self.send_to_session(session, {
            "type": "connection_status",
            "status": "LIVE",
            "symbol": display_symbol,
            "resolution": resolution,
        })

    async def handle_unsubscribe(self, session: ClientSession, raw_symbol: str, resolution: str = "1D") -> None:
        instrument_key = instrument_master.resolve_instrument_key(raw_symbol)
        item = instrument_master.get_by_key(instrument_key) if instrument_key else None
        display_symbol = item.display_symbol if item else raw_symbol.upper()
        sub_key = f"{display_symbol}:{resolution}"

        async with self._lock:
            session.subscriptions.discard(sub_key)
            if instrument_key:
                session.subscribed_keys.discard(instrument_key)
                sessions_set = self._instrument_to_sessions.get(instrument_key)
                if sessions_set:
                    sessions_set.discard(session)
                    if not sessions_set:
                        self._instrument_to_sessions.pop(instrument_key, None)

    async def broadcast_quote(self, quote: NormalizedQuote) -> None:
        """Broadcasts a newly updated quote to all interested sessions."""
        key = quote.instrument_key
        sessions = self._instrument_to_sessions.get(key)
        if not sessions:
            return

        display_symbol = f"{quote.exchange}:{quote.symbol}"
        frontend_data = quote.to_frontend_quote_dict()

        quote_msg = {
            "type": "quote_update",
            "symbol": display_symbol,
            "data": frontend_data,
        }
        bar_msg = {
            "type": "bar_update",
            "symbol": display_symbol,
            "data": {
                "time": quote.provider_timestamp or quote.received_timestamp,
                "open": quote.open_price or quote.last_price,
                "high": quote.high_price or quote.last_price,
                "low": quote.low_price or quote.last_price,
                "close": quote.last_price,
                "volume": quote.volume,
                "resolution": "1D",
            },
        }
        depth_msg = None
        if quote.depth:
            depth_msg = {
                "type": "orderbook_update",
                "symbol": display_symbol,
                "data": quote.depth.model_dump(),
            }

        for session in list(sessions):
            if session.is_alive:
                await self.send_to_session(session, quote_msg)
                await self.send_to_session(session, bar_msg)
                if depth_msg:
                    await self.send_to_session(session, depth_msg)

    async def send_to_session(self, session: ClientSession, payload: dict) -> None:
        if not session.is_alive:
            return
        try:
            # Drop older frames if buffer is full (backpressure prevention)
            if session.queue.full():
                try:
                    session.queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
            await session.queue.put(payload)
        except Exception:
            pass

    async def _session_writer(self, session: ClientSession) -> None:
        try:
            while session.is_alive:
                payload = await session.queue.get()
                text = json.dumps(payload)
                await session.websocket.send_text(text)
                session.queue.task_done()
        except (WebSocketDisconnect, asyncio.CancelledError):
            pass
        except Exception as e:
            logger.debug(f"Session writer error: {e}")

    async def _send_direct(self, websocket: WebSocket, payload: dict) -> None:
        try:
            await websocket.send_text(json.dumps(payload))
        except Exception:
            pass


connection_manager = ConnectionManager()

