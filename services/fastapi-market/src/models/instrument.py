from typing import Optional
from pydantic import BaseModel


class InstrumentItem(BaseModel):
    instrument_key: str
    symbol: str
    exchange: str
    name: str
    segment: str = "NSE_EQ"
    asset_type: str = "EQUITY"
    lot_size: int = 1
    tick_size: float = 0.05
    isin: Optional[str] = None
    tradable: bool = True

    @property
    def display_symbol(self) -> str:
        return f"{self.exchange}:{self.symbol}"

