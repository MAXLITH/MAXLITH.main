from fastapi import APIRouter, Response
from ..config import settings
from ..core.cache import quote_cache

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    stats = quote_cache.get_health_stats()
    return {
        "status": "ok",
        "service": "maxlith-fastapi-market",
        "version": "2.0.0",
        "providerConfigured": settings.is_upstox_configured,
        "upstoxConnected": stats["upstreamConnected"],
        "cachedQuotes": stats["cachedQuotesCount"],
        "ticksReceived": stats["ticksReceivedTotal"],
        "feedFresh": stats["feedFresh"],
        "redisEnabled": stats["redisEnabled"],
    }


@router.get("/ready")
async def readiness_check(response: Response):
    stats = quote_cache.get_health_stats()
    # Ready if application is running and healthy
    is_ready = True
    if not is_ready:
        response.status_code = 503
        return {"status": "not_ready"}
    return {
        "status": "ready",
        "upstreamConnected": stats["upstreamConnected"],
        "cachedQuotes": stats["cachedQuotesCount"],
    }


@router.get("/live")
async def liveness_check():
    return {"status": "live"}

