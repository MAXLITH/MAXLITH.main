from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel, Field


class ClientIncomingMessage(BaseModel):
    action: Literal["subscribe", "unsubscribe", "ping"]
    symbol: Optional[str] = None
    resolution: Optional[str] = "1D"
    mode: Optional[Literal["ltpc", "full"]] = None
    timestamp: Optional[int] = None


class ServerOutgoingMessage(BaseModel):
    type: str
    symbol: Optional[str] = None
    status: Optional[str] = None
    resolution: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    message: Optional[str] = None
    timestamp: Optional[int] = None

