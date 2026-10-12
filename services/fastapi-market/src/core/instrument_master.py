import logging
import re
from typing import Dict, List, Optional
from ..models.instrument import InstrumentItem

logger = logging.getLogger(__name__)


# Default high-liquidity instrument catalog with official Upstox instrument keys
DEFAULT_INSTRUMENTS: List[Dict[str, str]] = [
    # Top Indices
    {"symbol": "NIFTY50", "name": "Nifty 50", "exchange": "NSE", "key": "NSE_INDEX|Nifty 50", "segment": "NSE_INDEX", "asset_type": "INDEX"},
    {"symbol": "NIFTY", "name": "Nifty 50", "exchange": "NSE", "key": "NSE_INDEX|Nifty 50", "segment": "NSE_INDEX", "asset_type": "INDEX"},
    {"symbol": "BANKNIFTY", "name": "Nifty Bank", "exchange": "NSE", "key": "NSE_INDEX|Nifty Bank", "segment": "NSE_INDEX", "asset_type": "INDEX"},
    {"symbol": "FINNIFTY", "name": "Nifty Financial Services", "exchange": "NSE", "key": "NSE_INDEX|Nifty Fin Service", "segment": "NSE_INDEX", "asset_type": "INDEX"},
    {"symbol": "MIDCPNIFTY", "name": "NIFTY MID SELECT", "exchange": "NSE", "key": "NSE_INDEX|NIFTY MID SELECT", "segment": "NSE_INDEX", "asset_type": "INDEX"},
    {"symbol": "SENSEX", "name": "BSE Sensex", "exchange": "BSE", "key": "BSE_INDEX|SENSEX", "segment": "BSE_INDEX", "asset_type": "INDEX"},

    # Top NSE Large-Caps
    {"symbol": "RELIANCE", "name": "Reliance Industries Ltd", "exchange": "NSE", "key": "NSE_EQ|INE002A01018", "isin": "INE002A01018"},
    {"symbol": "TCS", "name": "Tata Consultancy Services Ltd", "exchange": "NSE", "key": "NSE_EQ|INE467B01029", "isin": "INE467B01029"},
    {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd", "exchange": "NSE", "key": "NSE_EQ|INE040A01034", "isin": "INE040A01034"},
    {"symbol": "INFY", "name": "Infosys Ltd", "exchange": "NSE", "key": "NSE_EQ|INE009A01021", "isin": "INE009A01021"},
    {"symbol": "ICICIBANK", "name": "ICICI Bank Ltd", "exchange": "NSE", "key": "NSE_EQ|INE090A01021", "isin": "INE090A01021"},
    {"symbol": "SBIN", "name": "State Bank of India", "exchange": "NSE", "key": "NSE_EQ|INE062A01020", "isin": "INE062A01020"},
    {"symbol": "BHARTIARTL", "name": "Bharti Airtel Ltd", "exchange": "NSE", "key": "NSE_EQ|INE397D01024", "isin": "INE397D01024"},
    {"symbol": "ITC", "name": "ITC Ltd", "exchange": "NSE", "key": "NSE_EQ|INE154A01025", "isin": "INE154A01025"},
    {"symbol": "LT", "name": "Larsen & Toubro Ltd", "exchange": "NSE", "key": "NSE_EQ|INE018A01030", "isin": "INE018A01030"},
    {"symbol": "LTIM", "name": "LTIMindtree Ltd", "exchange": "NSE", "key": "NSE_EQ|INE214T01019", "isin": "INE214T01019"},
    {"symbol": "AXISBANK", "name": "Axis Bank Ltd", "exchange": "NSE", "key": "NSE_EQ|INE238A01034", "isin": "INE238A01034"},
    {"symbol": "KOTAKBANK", "name": "Kotak Mahindra Bank Ltd", "exchange": "NSE", "key": "NSE_EQ|INE237A01028", "isin": "INE237A01028"},
    {"symbol": "TATAMOTORS", "name": "Tata Motors Ltd", "exchange": "NSE", "key": "NSE_EQ|INE155A01022", "isin": "INE155A01022"},
    {"symbol": "TATASTEEL", "name": "Tata Steel Ltd", "exchange": "NSE", "key": "NSE_EQ|INE081A01020", "isin": "INE081A01020"},
    {"symbol": "WIPRO", "name": "Wipro Ltd", "exchange": "NSE", "key": "NSE_EQ|INE075A01022", "isin": "INE075A01022"},
    {"symbol": "HCLTECH", "name": "HCL Technologies Ltd", "exchange": "NSE", "key": "NSE_EQ|INE860A01027", "isin": "INE860A01027"},
    {"symbol": "MARUTI", "name": "Maruti Suzuki India Ltd", "exchange": "NSE", "key": "NSE_EQ|INE585B01010", "isin": "INE585B01010"},
    {"symbol": "SUNPHARMA", "name": "Sun Pharmaceutical Industries Ltd", "exchange": "NSE", "key": "NSE_EQ|INE044A01036", "isin": "INE044A01036"},
    {"symbol": "TITAN", "name": "Titan Company Ltd", "exchange": "NSE", "key": "NSE_EQ|INE280A01028", "isin": "INE280A01028"},
    {"symbol": "BAJFINANCE", "name": "Bajaj Finance Ltd", "exchange": "NSE", "key": "NSE_EQ|INE296A01024", "isin": "INE296A01024"},
    {"symbol": "BAJAJFINSV", "name": "Bajaj Finserv Ltd", "exchange": "NSE", "key": "NSE_EQ|INE918I01018", "isin": "INE918I01018"},
    {"symbol": "ADANIENT", "name": "Adani Enterprises Ltd", "exchange": "NSE", "key": "NSE_EQ|INE423A01024", "isin": "INE423A01024"},
    {"symbol": "ADANIPORTS", "name": "Adani Ports and SEZ Ltd", "exchange": "NSE", "key": "NSE_EQ|INE742F01042", "isin": "INE742F01042"},
    {"symbol": "ASIANPAINT", "name": "Asian Paints Ltd", "exchange": "NSE", "key": "NSE_EQ|INE021A01026", "isin": "INE021A01026"},
    {"symbol": "POWERGRID", "name": "Power Grid Corporation of India Ltd", "exchange": "NSE", "key": "NSE_EQ|INE752E01010", "isin": "INE752E01010"},
    {"symbol": "NTPC", "name": "NTPC Ltd", "exchange": "NSE", "key": "NSE_EQ|INE733E01010", "isin": "INE733E01010"},
    {"symbol": "ONGC", "name": "Oil & Natural Gas Corporation Ltd", "exchange": "NSE", "key": "NSE_EQ|INE213A01029", "isin": "INE213A01029"},
    {"symbol": "COALINDIA", "name": "Coal India Ltd", "exchange": "NSE", "key": "NSE_EQ|INE522F01014", "isin": "INE522F01014"},
    {"symbol": "ULTRACEMCO", "name": "UltraTech Cement Ltd", "exchange": "NSE", "key": "NSE_EQ|INE481G01011", "isin": "INE481G01011"},
    {"symbol": "NESTLEIND", "name": "Nestle India Ltd", "exchange": "NSE", "key": "NSE_EQ|INE239A01016", "isin": "INE239A01016"},
    {"symbol": "JSWSTEEL", "name": "JSW Steel Ltd", "exchange": "NSE", "key": "NSE_EQ|INE019A01038", "isin": "INE019A01038"},
    {"symbol": "GRASIM", "name": "Grasim Industries Ltd", "exchange": "NSE", "key": "NSE_EQ|INE047A01021", "isin": "INE047A01021"},
    {"symbol": "HINDUNILVR", "name": "Hindustan Unilever Ltd", "exchange": "NSE", "key": "NSE_EQ|INE030A01027", "isin": "INE030A01027"},
    {"symbol": "DRREDDY", "name": "Dr. Reddy's Laboratories Ltd", "exchange": "NSE", "key": "NSE_EQ|INE089A01023", "isin": "INE089A01023"},
    {"symbol": "CIPLA", "name": "Cipla Ltd", "exchange": "NSE", "key": "NSE_EQ|INE059A01026", "isin": "INE059A01026"},
    {"symbol": "EICHERMOT", "name": "Eicher Motors Ltd", "exchange": "NSE", "key": "NSE_EQ|INE066A01021", "isin": "INE066A01021"},
    {"symbol": "DIVISLAB", "name": "Divi's Laboratories Ltd", "exchange": "NSE", "key": "NSE_EQ|INE361B01024", "isin": "INE361B01024"},
    {"symbol": "HEROMOTOCO", "name": "Hero MotoCorp Ltd", "exchange": "NSE", "key": "NSE_EQ|INE158A01026", "isin": "INE158A01026"},
    {"symbol": "TECHM", "name": "Tech Mahindra Ltd", "exchange": "NSE", "key": "NSE_EQ|INE669C01036", "isin": "INE669C01036"},
    {"symbol": "BPCL", "name": "Bharat Petroleum Corporation Ltd", "exchange": "NSE", "key": "NSE_EQ|INE029A01011", "isin": "INE029A01011"},
    {"symbol": "HINDALCO", "name": "Hindalco Industries Ltd", "exchange": "NSE", "key": "NSE_EQ|INE038A01020", "isin": "INE038A01020"},
    {"symbol": "TATACONSUM", "name": "Tata Consumer Products Ltd", "exchange": "NSE", "key": "NSE_EQ|INE192A01025", "isin": "INE192A01025"},
    {"symbol": "BRITANNIA", "name": "Britannia Industries Ltd", "exchange": "NSE", "key": "NSE_EQ|INE216A01030", "isin": "INE216A01030"},
    {"symbol": "APOLLOHOSP", "name": "Apollo Hospitals Enterprise Ltd", "exchange": "NSE", "key": "NSE_EQ|INE437A01024", "isin": "INE437A01024"},
    {"symbol": "INDUSINDBK", "name": "IndusInd Bank Ltd", "exchange": "NSE", "key": "NSE_EQ|INE095A01012", "isin": "INE095A01012"},
    {"symbol": "SBILIFE", "name": "SBI Life Insurance Company Ltd", "exchange": "NSE", "key": "NSE_EQ|INE123W01016", "isin": "INE123W01016"},
    {"symbol": "HDFCLIFE", "name": "HDFC Life Insurance Company Ltd", "exchange": "NSE", "key": "NSE_EQ|INE795G01014", "isin": "INE795G01014"},
    {"symbol": "BEL", "name": "Bharat Electronics Ltd", "exchange": "NSE", "key": "NSE_EQ|INE263A01024", "isin": "INE263A01024"},
    {"symbol": "TRENT", "name": "Trent Ltd", "exchange": "NSE", "key": "NSE_EQ|INE849A01020", "isin": "INE849A01020"},
    {"symbol": "SHRIRAMFIN", "name": "Shriram Finance Ltd", "exchange": "NSE", "key": "NSE_EQ|INE721A01013", "isin": "INE721A01013"},
]


class InstrumentMaster:
    def __init__(self):
        self._by_key: Dict[str, InstrumentItem] = {}
        self._by_symbol: Dict[str, InstrumentItem] = {}  # e.g. "NSE:RELIANCE", "RELIANCE"
        self._load_defaults()

    def _load_defaults(self):
        for raw in DEFAULT_INSTRUMENTS:
            item = InstrumentItem(
                instrument_key=raw["key"],
                symbol=raw["symbol"],
                exchange=raw["exchange"],
                name=raw["name"],
                segment=raw.get("segment", "NSE_EQ"),
                asset_type=raw.get("asset_type", "EQUITY"),
                lot_size=1,
                tick_size=0.05,
                isin=raw.get("isin"),
                tradable=raw.get("asset_type") != "INDEX",
            )
            self.register_instrument(item)

    def register_instrument(self, item: InstrumentItem) -> None:
        self._by_key[item.instrument_key] = item
        # Store multiple index keys
        self._by_symbol[f"{item.exchange}:{item.symbol}".upper()] = item
        self._by_symbol[item.symbol.upper()] = item
        if item.isin:
            self._by_symbol[item.isin.upper()] = item

    def resolve_instrument_key(self, identifier: str) -> Optional[str]:
        """
        Converts any symbol representation (e.g. 'NSE:RELIANCE', 'RELIANCE', 'NSE_EQ|INE002A01018')
        into an Upstox instrument key.
        """
        if not identifier:
            return None
        cleaned = identifier.strip().upper()
        # Direct key match
        if cleaned in self._by_key:
            return cleaned
        # Symbol match
        if cleaned in self._by_symbol:
            return self._by_symbol[cleaned].instrument_key

        # If it contains pipe '|', it's already an Upstox key
        if "|" in cleaned:
            return cleaned

        # Handle 'NSE:SYMBOL' or 'BSE:SYMBOL'
        if ":" in cleaned:
            parts = cleaned.split(":")
            if len(parts) == 2:
                exchange, sym = parts[0], parts[1]
                lookup_key = f"{exchange}:{sym}"
                if lookup_key in self._by_symbol:
                    return self._by_symbol[lookup_key].instrument_key
                if sym in self._by_symbol:
                    return self._by_symbol[sym].instrument_key
                # Synthesize standard key
                return f"{exchange}_EQ|{sym}"

        # Default to NSE_EQ
        return f"NSE_EQ|{cleaned}"

    def get_by_key(self, instrument_key: str) -> Optional[InstrumentItem]:
        if instrument_key in self._by_key:
            return self._by_key[instrument_key]
        # Synthesize fallback item if valid format
        if "|" in instrument_key:
            prefix, sym = instrument_key.split("|", 1)
            exchange = "BSE" if "BSE" in prefix else "NSE"
            asset_type = "INDEX" if "INDEX" in prefix else "EQUITY"
            return InstrumentItem(
                instrument_key=instrument_key,
                symbol=sym,
                exchange=exchange,
                name=sym,
                segment=prefix,
                asset_type=asset_type,
            )
        return None

    def get_by_symbol(self, symbol: str) -> Optional[InstrumentItem]:
        cleaned = symbol.strip().upper()
        if cleaned in self._by_symbol:
            return self._by_symbol[cleaned]
        key = self.resolve_instrument_key(symbol)
        if key:
            return self.get_by_key(key)
        return None

    def search(self, query: str, limit: int = 20) -> List[InstrumentItem]:
        q = query.strip().upper()
        if not q:
            return list(self._by_key.values())[:limit]

        results = []
        seen = set()
        for item in self._by_key.values():
            if item.instrument_key in seen:
                continue
            if q in item.symbol.upper() or q in item.name.upper() or (item.isin and q in item.isin.upper()):
                results.append(item)
                seen.add(item.instrument_key)
                if len(results) >= limit:
                    break
        return results


instrument_master = InstrumentMaster()

