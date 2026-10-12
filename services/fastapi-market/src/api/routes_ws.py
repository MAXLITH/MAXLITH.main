import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..config import settings
from ..core.auth import AuthError, verify_market_stream_token
from ..engine.connection_manager import connection_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/market")
async def websocket_market_endpoint(websocket: WebSocket):
    # Origin validation if configured
    origin = websocket.headers.get("origin")
    allowed_origins = settings.allowed_origins_list
    if allowed_origins != ["*"] and origin:
        if origin not in allowed_origins:
            logger.warning(f"Rejected WebSocket connection from disallowed origin: {origin}")
            await websocket.close(code=4003, reason="Origin not allowed")
            return

    # Authenticate stream token
    token = websocket.query_params.get("token")
    try:
        user_id = verify_market_stream_token(token)
    except AuthError as auth_err:
        logger.warning(f"WebSocket auth failed: {auth_err.message}")
        await websocket.close(code=4001, reason=auth_err.message)
        return

    await websocket.accept()
    session = None
    try:
        session = await connection_manager.register(websocket, user_id)
        logger.info(f"WebSocket client connected for user {user_id}")

        while True:
            text = await websocket.receive_text()
            try:
                data = json.loads(text)
            except Exception:
                await websocket.send_text(json.dumps({"type": "error", "message": "Invalid JSON message."}))
                continue

            action = data.get("action")
            if action == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
            elif action == "subscribe":
                symbol = data.get("symbol")
                resolution = data.get("resolution", "1D")
                mode = data.get("mode", "full")
                if not symbol:
                    await websocket.send_text(json.dumps({"type": "error", "message": "Symbol is required for subscription."}))
                else:
                    await connection_manager.handle_subscribe(session, symbol, resolution, mode)
            elif action == "unsubscribe":
                symbol = data.get("symbol")
                resolution = data.get("resolution", "1D")
                if symbol:
                    await connection_manager.handle_unsubscribe(session, symbol, resolution)

    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected for user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket connection error for user {user_id}: {e}")
    finally:
        if session:
            await connection_manager.unregister(websocket)

