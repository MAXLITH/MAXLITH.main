import os
import sys
import pytest

# Add service directory and proto directory to sys.path
test_dir = os.path.dirname(os.path.abspath(__file__))
svc_dir = os.path.abspath(os.path.join(test_dir, ".."))
proto_dir = os.path.join(svc_dir, "proto")
if svc_dir not in sys.path:
    sys.path.insert(0, svc_dir)
if proto_dir not in sys.path:
    sys.path.insert(0, proto_dir)

import MarketDataFeedV3_pb2 as pb
from src.core.quote_normalizer import QuoteNormalizer


def test_decode_and_normalize_ltpc():
    # Construct binary Protobuf message for LTPC feed
    response = pb.FeedResponse()
    response.type = pb.Type.live_feed
    response.currentTs = 1718000000000

    feed = response.feeds["NSE_EQ|INE002A01018"]
    feed.ltpc.ltp = 2950.50
    feed.ltpc.cp = 2900.00
    feed.ltpc.ltt = 1718000000000
    feed.ltpc.ltq = 25

    raw_bytes = response.SerializeToString()
    decoded = QuoteNormalizer.decode_protobuf(raw_bytes)

    assert decoded.type == pb.Type.live_feed
    assert "NSE_EQ|INE002A01018" in decoded.feeds

    quote = QuoteNormalizer.normalize_feed(
        instrument_key="NSE_EQ|INE002A01018",
        feed=decoded.feeds["NSE_EQ|INE002A01018"],
        current_ts=decoded.currentTs,
    )

    assert quote is not None
    assert quote.symbol == "RELIANCE"
    assert quote.exchange == "NSE"
    assert quote.last_price == 2950.50
    assert quote.previous_close == 2900.00
    assert quote.change == 50.50
    assert round(quote.change_percent, 2) == 1.74
    assert quote.feed_mode == "ltpc"
    assert quote.is_stale is False


def test_decode_and_normalize_full_feed():
    # Construct binary Protobuf message for Full Market Feed
    response = pb.FeedResponse()
    response.type = pb.Type.live_feed
    response.currentTs = 1718000000000

    feed = response.feeds["NSE_EQ|INE467B01029"]  # TCS
    market_ff = feed.fullFeed.marketFF
    market_ff.ltpc.ltp = 3850.00
    market_ff.ltpc.cp = 3800.00
    market_ff.ltpc.ltt = 1718000000000
    market_ff.ltpc.ltq = 10
    market_ff.atp = 3825.50
    market_ff.vtt = 1500000

    # Add 5-level market depth
    for i in range(1, 4):
        q = market_ff.marketLevel.bidAskQuote.add()
        q.bidP = 3850.00 - (i * 0.5)
        q.bidQ = 100 * i
        q.askP = 3850.50 + (i * 0.5)
        q.askQ = 150 * i

    # Add daily OHLC
    ohlc = market_ff.marketOHLC.ohlc.add()
    ohlc.interval = "1d"
    ohlc.open = 3810.00
    ohlc.high = 3875.00
    ohlc.low = 3795.00
    ohlc.close = 3850.00
    ohlc.vol = 1500000

    raw_bytes = response.SerializeToString()
    decoded = QuoteNormalizer.decode_protobuf(raw_bytes)

    quote = QuoteNormalizer.normalize_feed(
        instrument_key="NSE_EQ|INE467B01029",
        feed=decoded.feeds["NSE_EQ|INE467B01029"],
        current_ts=decoded.currentTs,
    )

    assert quote is not None
    assert quote.symbol == "TCS"
    assert quote.last_price == 3850.00
    assert quote.open_price == 3810.00
    assert quote.high_price == 3875.00
    assert quote.low_price == 3795.00
    assert quote.volume == 1500000
    assert quote.average_traded_price == 3825.50
    assert quote.feed_mode == "full"
    assert quote.depth is not None
    assert len(quote.depth.bids) == 3
    assert len(quote.depth.asks) == 3
    assert quote.depth.bids[0].price == 3849.50
    assert quote.depth.asks[0].price == 3851.00

    # Verify frontend formatting dictionary
    frontend_dict = quote.to_frontend_quote_dict()
    assert frontend_dict["last"] == 3850.00
    assert frontend_dict["change"] == 50.00
    assert frontend_dict["source"] == "UPSTOX_V3"


def test_incremental_update_merging():
    # First create full quote
    response1 = pb.FeedResponse()
    feed1 = response1.feeds["NSE_EQ|INE002A01018"]
    feed1.fullFeed.marketFF.ltpc.ltp = 2900.0
    feed1.fullFeed.marketFF.ltpc.cp = 2850.0
    ohlc = feed1.fullFeed.marketFF.marketOHLC.ohlc.add()
    ohlc.open = 2860.0
    ohlc.high = 2920.0
    ohlc.low = 2850.0
    ohlc.close = 2900.0

    full_quote = QuoteNormalizer.normalize_feed(
        instrument_key="NSE_EQ|INE002A01018",
        feed=feed1,
        current_ts=1000,
    )
    assert full_quote.open_price == 2860.0

    # Second is an incremental tick with ONLY LTPC
    response2 = pb.FeedResponse()
    feed2 = response2.feeds["NSE_EQ|INE002A01018"]
    feed2.ltpc.ltp = 2915.0  # new tick
    feed2.ltpc.ltt = 2000

    merged_quote = QuoteNormalizer.normalize_feed(
        instrument_key="NSE_EQ|INE002A01018",
        feed=feed2,
        current_ts=2000,
        previous_quote=full_quote,
    )

    # Should retain open_price and high from full_quote while updating last_price
    assert merged_quote.last_price == 2915.0
    assert merged_quote.open_price == 2860.0
    assert merged_quote.previous_close == 2850.0
    assert merged_quote.change == 65.0

