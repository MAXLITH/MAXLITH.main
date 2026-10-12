import logging
import sys
import os
import time
from typing import Dict, List, Optional, Tuple

# Ensure proto package is importable
current_dir = os.path.dirname(os.path.abspath(__file__))
proto_dir = os.path.abspath(os.path.join(current_dir, "..", "..", "proto"))
if proto_dir not in sys.path:
    sys.path.insert(0, proto_dir)

import MarketDataFeedV3_pb2 as pb
from ..models.quote import DepthLevel, MarketDepth, NormalizedQuote, OHLCBar
from .instrument_master import instrument_master

logger = logging.getLogger(__name__)


class QuoteNormalizer:
    @staticmethod
    def decode_protobuf(raw_bytes: bytes) -> pb.FeedResponse:
        """Parses binary message buffer into Upstox FeedResponse protobuf message."""
        response = pb.FeedResponse()
        response.ParseFromString(raw_bytes)
        return response

    @classmethod
    def normalize_feed(
        cls,
        instrument_key: str,
        feed: pb.Feed,
        current_ts: int,
        previous_quote: Optional[NormalizedQuote] = None,
    ) -> Optional[NormalizedQuote]:
        """
        Normalizes an individual Upstox Feed protobuf message into a NormalizedQuote.
        If previous_quote is provided, safely merges incremental updates.
        """
        now_ms = int(time.time() * 1000)
        provider_ts = current_ts if current_ts > 0 else now_ms

        # Resolve instrument metadata
        item = instrument_master.get_by_key(instrument_key)
        symbol = item.symbol if item else instrument_key.split("|")[-1]
        exchange = item.exchange if item else ("BSE" if "BSE" in instrument_key else "NSE")
        name = item.name if item else symbol

        ltpc_data = None
        market_level_data = None
        market_ohlc_data = None
        vtt = None
        atp = None
        oi = None
        tbq = None
        tsq = None
        feed_mode = "ltpc"

        # Check union type in feed
        feed_case = feed.WhichOneof("FeedUnion")

        if feed_case == "ltpc":
            ltpc_data = feed.ltpc
            feed_mode = "ltpc"
        elif feed_case == "fullFeed":
            feed_mode = "full"
            full_feed = feed.fullFeed
            full_case = full_feed.WhichOneof("FullFeedUnion")
            if full_case == "marketFF":
                market_ff = full_feed.marketFF
                ltpc_data = market_ff.ltpc
                market_level_data = market_ff.marketLevel
                market_ohlc_data = market_ff.marketOHLC
                vtt = market_ff.vtt
                atp = market_ff.atp
                oi = market_ff.oi
                tbq = market_ff.tbq
                tsq = market_ff.tsq
            elif full_case == "indexFF":
                index_ff = full_feed.indexFF
                ltpc_data = index_ff.ltpc
                market_ohlc_data = index_ff.marketOHLC
        elif feed_case == "firstLevelWithGreeks":
            first_level = feed.firstLevelWithGreeks
            ltpc_data = first_level.ltpc
            vtt = first_level.vtt
            oi = first_level.oi
            feed_mode = "full"

        if not ltpc_data and not previous_quote:
            return None

        # Extract or retain LTPC values
        ltp = ltpc_data.ltp if (ltpc_data and ltpc_data.ltp > 0) else (previous_quote.last_price if previous_quote else 0.0)
        cp = ltpc_data.cp if (ltpc_data and ltpc_data.cp > 0) else (previous_quote.previous_close if previous_quote else 0.0)
        ltt = ltpc_data.ltt if (ltpc_data and ltpc_data.ltt > 0) else (previous_quote.last_trade_timestamp if previous_quote else provider_ts)
        ltq = ltpc_data.ltq if (ltpc_data and ltpc_data.ltq > 0) else (previous_quote.last_traded_quantity if previous_quote else None)

        if ltp <= 0 and previous_quote and previous_quote.last_price > 0:
            ltp = previous_quote.last_price

        if ltp <= 0:
            return None

        # Compute price changes
        if cp > 0:
            change = ltp - cp
            change_percent = (change / cp) * 100.0
        elif previous_quote and previous_quote.previous_close > 0:
            cp = previous_quote.previous_close
            change = ltp - cp
            change_percent = (change / cp) * 100.0
        else:
            change = 0.0
            change_percent = 0.0

        # Extract OHLC if available
        open_p = previous_quote.open_price if previous_quote else None
        high_p = previous_quote.high_price if previous_quote else None
        low_p = previous_quote.low_price if previous_quote else None
        volume = vtt if (vtt is not None and vtt >= 0) else (previous_quote.volume if previous_quote else 0)

        if market_ohlc_data and market_ohlc_data.ohlc:
            for bar in market_ohlc_data.ohlc:
                # Typically Upstox provides daily or intraday interval bars
                if bar.open > 0:
                    open_p = bar.open
                if bar.high > 0:
                    high_p = max(high_p or bar.high, bar.high, ltp)
                if bar.low > 0:
                    low_p = min(low_p or bar.low, bar.low, ltp)
                if bar.vol > 0 and volume == 0:
                    volume = bar.vol

        # Ensure high/low bound sanity
        if open_p is None:
            open_p = ltp
        if high_p is None or high_p < ltp:
            high_p = max(open_p, ltp)
        if low_p is None or low_p > ltp:
            low_p = min(open_p, ltp)

        # Parse market depth
        depth = previous_quote.depth if previous_quote else None
        if market_level_data and market_level_data.bidAskQuote:
            bids: List[DepthLevel] = []
            asks: List[DepthLevel] = []
            for q in market_level_data.bidAskQuote:
                if q.bidP > 0 and q.bidQ > 0:
                    bids.append(DepthLevel(price=q.bidP, quantity=q.bidQ))
                if q.askP > 0 and q.askQ > 0:
                    asks.append(DepthLevel(price=q.askP, quantity=q.askQ))
            depth = MarketDepth(
                bids=sorted(bids, key=lambda x: x.price, reverse=True)[:5],
                asks=sorted(asks, key=lambda x: x.price)[:5],
            )

        return NormalizedQuote(
            instrument_key=instrument_key,
            symbol=symbol,
            exchange=exchange,
            name=name,
            last_price=ltp,
            previous_close=cp,
            change=change,
            change_percent=change_percent,
            open_price=open_p,
            high_price=high_p,
            low_price=low_p,
            volume=volume,
            last_traded_quantity=ltq,
            last_trade_timestamp=ltt,
            average_traded_price=atp if (atp is not None and atp > 0) else (previous_quote.average_traded_price if previous_quote else None),
            open_interest=oi if (oi is not None and oi > 0) else (previous_quote.open_interest if previous_quote else None),
            total_buy_quantity=tbq if tbq is not None else (previous_quote.total_buy_quantity if previous_quote else None),
            total_sell_quantity=tsq if tsq is not None else (previous_quote.total_sell_quantity if previous_quote else None),
            depth=depth,
            provider_timestamp=provider_ts,
            received_timestamp=now_ms,
            feed_mode=feed_mode,
            is_stale=False,
            source="UPSTOX_V3",
        )

