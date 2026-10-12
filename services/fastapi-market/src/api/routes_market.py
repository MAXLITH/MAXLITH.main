import datetime
import logging
from typing import Dict, List, Optional
import httpx
from fastapi import APIRouter, HTTPException, Query

from ..config import settings
from ..core.cache import quote_cache
from ..core.instrument_master import instrument_master
from ..engine.paper_validator import OrderValidationRequest, OrderValidationResult, PaperOrderValidator
from ..models.quote import MarketDepth, MarketStatus, NormalizedQuote

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/market", tags=["Market Data"])


def _map_resolution_to_upstox(resolution: str) -> str:
    r = resolution.strip().upper()
    mapping = {
        "1": "1minute",
        "1M": "1minute",
        "3": "3minute",
        "3M": "3minute",
        "5": "5minute",
        "5M": "5minute",
        "15": "15minute",
        "15M": "15minute",
        "30": "30minute",
        "30M": "30minute",
        "60": "30minute",  # Upstox v2 standard bucket
        "1D": "day",
        "D": "day",
        "1W": "week",
        "W": "week",
        "1MON": "month",
        "M": "month",
    }
    return mapping.get(r, "day")


@router.get("/status", response_model=MarketStatus)
async def get_market_status():
    """Returns current market session status and Indian exchange segment state."""
    return quote_cache.get_market_status()


@router.get("/quotes")
async def get_quotes(
    instruments: Optional[str] = Query(None, description="Comma-separated instrument keys or symbols"),
    symbols: Optional[str] = Query(None, description="Alternative alias for instruments query"),
):
    """
    Returns normalized quotes for requested instruments or symbols.
    If none provided, returns quotes from the default tracked watchlist.
    """
    raw_query = instruments or symbols or settings.DEFAULT_WATCHLIST
    keys_or_syms = [k.strip() for k in raw_query.split(",") if k.strip()]

    result = {}
    for item in keys_or_syms:
        # Resolve to instrument key
        key = instrument_master.resolve_instrument_key(item)
        if key:
            q = await quote_cache.get_quote(key)
            if q:
                result[item] = q.to_snapshot_dict()
            else:
                # Placeholder quote if not yet updated by feed
                inst = instrument_master.get_by_key(key)
                if inst:
                    result[item] = {
                        "instrumentKey": key,
                        "symbol": inst.symbol,
                        "exchange": inst.exchange,
                        "name": inst.name,
                        "lastPrice": 0.0,
                        "isStale": True,
                        "source": "PENDING_FEED",
                    }
    return {"quotes": result}


@router.get("/quotes/{instrument_key:path}")
async def get_single_quote(instrument_key: str):
    """Returns real-time quote snapshot for a specific instrument."""
    resolved_key = instrument_master.resolve_instrument_key(instrument_key)
    if not resolved_key:
        raise HTTPException(status_code=404, detail="Unknown instrument identifier")

    quote = await quote_cache.get_quote(resolved_key)
    if not quote:
        # If not cached yet, check if instrument exists
        inst = instrument_master.get_by_key(resolved_key)
        if not inst:
            raise HTTPException(status_code=404, detail="Instrument not found")
        return {
            "instrumentKey": resolved_key,
            "symbol": inst.symbol,
            "exchange": inst.exchange,
            "name": inst.name,
            "lastPrice": 0.0,
            "isStale": True,
            "source": "PENDING_FEED",
        }
    return quote.to_snapshot_dict()


@router.get("/depth")
async def get_market_depth(symbol: str = Query(..., description="Symbol or instrument key")):
    """Returns 5-level market depth (bids and asks) for an instrument."""
    key = instrument_master.resolve_instrument_key(symbol)
    if not key:
        raise HTTPException(status_code=404, detail=f"Unknown symbol: {symbol}")

    quote = await quote_cache.get_quote(key)
    if not quote or not quote.depth:
        return {"symbol": symbol, "instrumentKey": key, "depth": {"bids": [], "asks": []}}

    return {
        "symbol": f"{quote.exchange}:{quote.symbol}",
        "instrumentKey": key,
        "depth": quote.depth.model_dump(),
        "lastPrice": quote.last_price,
        "timestamp": quote.provider_timestamp or quote.received_timestamp,
    }


@router.get("/indices")
async def get_market_indices():
    """Returns quotes for key benchmark indices (NIFTY 50, BANK NIFTY, FINNIFTY, SENSEX)."""
    indices = ["NSE_INDEX|Nifty 50", "NSE_INDEX|Nifty Bank", "NSE_INDEX|Nifty Fin Service", "BSE_INDEX|SENSEX"]
    results = []
    for key in indices:
        q = await quote_cache.get_quote(key)
        inst = instrument_master.get_by_key(key)
        if q:
            results.append(q.to_snapshot_dict())
        elif inst:
            results.append({
                "instrumentKey": key,
                "symbol": inst.symbol,
                "name": inst.name,
                "exchange": inst.exchange,
                "lastPrice": 0.0,
                "isStale": True,
            })
    return {"indices": results}


@router.get("/candles")
async def get_historical_candles(
    symbol: str = Query(..., description="Symbol e.g. NSE:RELIANCE or instrument key"),
    resolution: str = Query("1D", description="Timeframe resolution e.g. 1, 5, 15, 30, 1D, 1W"),
    to_date: Optional[str] = Query(None, description="To date in YYYY-MM-DD format (defaults to today)"),
):
    """
    Fetches historical OHLCV candles from Upstox historical candle endpoint,
    validates invariants, and appends the active forming candle from live feed.
    """
    key = instrument_master.resolve_instrument_key(symbol)
    if not key:
        raise HTTPException(status_code=400, detail=f"Invalid symbol: {symbol}")

    interval = _map_resolution_to_upstox(resolution)
    today_str = to_date or datetime.date.today().isoformat()

    url = f"{settings.UPSTOX_HISTORICAL_URL}/{key}/{interval}/{today_str}"
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {settings.UPSTOX_ACCESS_TOKEN}",
    }

    candles = []
    if settings.is_upstox_configured:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    json_data = res.json()
                    raw_candles = json_data.get("data", {}).get("candles", [])
                    for c in raw_candles:
                        if not c or len(c) < 5:
                            continue
                        ts_str = str(c[0])
                        open_p = float(c[1])
                        high_p = float(c[2])
                        low_p = float(c[3])
                        close_p = float(c[4])
                        vol = int(c[5]) if len(c) > 5 else 0

                        # Candle validity checks
                        if open_p <= 0 or close_p <= 0 or high_p < max(open_p, close_p) or low_p > min(open_p, close_p):
                            continue

                        candles.append({
                            "timestamp": ts_str,
                            "open": open_p,
                            "high": high_p,
                            "low": low_p,
                            "close": close_p,
                            "volume": vol,
                        })
                    # Upstox returns newest candle first; reverse to chronological order
                    candles.reverse()
        except Exception as e:
            logger.error(f"Error fetching historical candles for {key}: {e}")

    # If live quote exists, ensure latest candle reflects live price
    live_quote = await quote_cache.get_quote(key)
    if live_quote and live_quote.last_price > 0:
        now_iso = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
        if candles:
            last_c = candles[-1]
            # If today's daily candle, update close, high, low
            if interval == "day" and last_c["timestamp"][:10] == today_str:
                last_c["close"] = live_quote.last_price
                last_c["high"] = max(last_c["high"], live_quote.last_price)
                last_c["low"] = min(last_c["low"], live_quote.last_price)
                if live_quote.volume > 0:
                    last_c["volume"] = max(last_c["volume"], live_quote.volume)

    return {
        "symbol": symbol,
        "instrumentKey": key,
        "resolution": resolution,
        "candles": candles,
    }


@router.post("/validate-order", response_model=OrderValidationResult)
async def validate_paper_order(req: OrderValidationRequest):
    """
    Validates a paper order execution against authenticated server-side quotes.
    Used by paper trading engine to prevent client-side price tampering.
    """
    return await PaperOrderValidator.validate_order(req)

