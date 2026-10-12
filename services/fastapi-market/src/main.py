import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes_health import router as health_router
from .api.routes_instruments import router as instruments_router
from .api.routes_market import router as market_router
from .api.routes_ws import router as ws_router
from .config import settings
from .core.cache import quote_cache
from .engine.connection_manager import connection_manager
from .engine.upstox_client import UpstoxFeedClient

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("maxlith.market")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup sequence
    logger.info("Initializing MAXLITH V2 Market Data Service...")
    await quote_cache.initialize()

    upstox_feed = UpstoxFeedClient(on_quote_update=connection_manager.broadcast_quote)
    connection_manager.set_upstox_client(upstox_feed)
    await upstox_feed.start()

    yield

    # Shutdown sequence
    logger.info("Shutting down MAXLITH V2 Market Data Service...")
    await upstox_feed.stop()
    await quote_cache.close()


app = FastAPI(
    title="MAXLITH V2 Market Data Service",
    description="High-performance Upstox V3 Market Data Feed backend with Protobuf streaming",
    version="2.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(health_router)
app.include_router(market_router)
app.include_router(instruments_router)
app.include_router(ws_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.HOST,
        port=settings.PORT,
        log_level=settings.LOG_LEVEL.lower(),
        reload=False,
    )

