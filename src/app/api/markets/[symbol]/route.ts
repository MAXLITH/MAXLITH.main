import { NextResponse } from 'next/server';
import { getInstrument, getInstrumentHistory } from '@/lib/market-data';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const instrument = getInstrument(symbol);

    if (!instrument) {
      return NextResponse.json({ error: `Instrument ${symbol} not found.` }, { status: 404 });
    }

    const history = getInstrumentHistory(symbol);

    return NextResponse.json({
      instrument,
      history
    });
  } catch (error: any) {
    console.error('Market instrument details API error', error);
    return NextResponse.json({ error: 'Failed to fetch instrument details' }, { status: 500 });
  }
}
