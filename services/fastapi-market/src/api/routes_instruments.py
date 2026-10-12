from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from ..core.instrument_master import instrument_master
from ..models.instrument import InstrumentItem

router = APIRouter(prefix="/api/v1/instruments", tags=["Instruments"])


@router.get("/search", response_model=List[InstrumentItem])
async def search_instruments(
    q: str = Query("", description="Symbol or company name query"),
    limit: int = Query(20, ge=1, le=100),
):
    """Searches official instruments by ticker symbol, ISIN, or company name."""
    return instrument_master.search(q, limit=limit)


@router.get("/{instrument_key:path}", response_model=InstrumentItem)
async def get_instrument(instrument_key: str):
    """Retrieves instrument master metadata for a specific Upstox instrument key."""
    item = instrument_master.get_by_key(instrument_key)
    if not item:
        # Check if symbol was passed instead of instrument key
        item = instrument_master.get_by_symbol(instrument_key)
    if not item:
        raise HTTPException(status_code=404, detail=f"Instrument not found: {instrument_key}")
    return item

