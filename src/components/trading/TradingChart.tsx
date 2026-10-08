'use client';

import { useEffect, useRef } from 'react';
import {
  AreaSeries,
  BarSeries,
  BaselineSeries,
  CandlestickSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  type UTCTimestamp,
} from 'lightweight-charts';
import { DEFAULT_CHART_OPTIONS, type ChartType } from '@/lib/tradingview/chartConfig';
import type { MarketBar } from '@/lib/tradingview/datafeed';
import { ema, sessionVwap, sma } from '@/lib/tradingview/indicators';

type MainSeries = ISeriesApi<SeriesType>;
export type OverlayIndicator = 'SMA20' | 'EMA20' | 'VWAP';

function makeSeries(chart: IChartApi, type: ChartType): MainSeries {
  if (type === 'bar') return chart.addSeries(BarSeries, { upColor: '#22c55e', downColor: '#ef4444', thinBars: false });
  if (type === 'line') return chart.addSeries(LineSeries, { color: '#38bdf8', lineWidth: 2, crosshairMarkerRadius: 3 });
  if (type === 'area') return chart.addSeries(AreaSeries, {
    lineColor: '#38bdf8', topColor: 'rgba(56, 189, 248, 0.24)', bottomColor: 'rgba(56, 189, 248, 0.01)', lineWidth: 2,
  });
  if (type === 'baseline') return chart.addSeries(BaselineSeries, {
    baseValue: { type: 'price', price: 0 }, topLineColor: '#22c55e', topFillColor1: 'rgba(34, 197, 94, 0.18)',
    topFillColor2: 'rgba(34, 197, 94, 0.02)', bottomLineColor: '#ef4444',
    bottomFillColor1: 'rgba(239, 68, 68, 0.02)', bottomFillColor2: 'rgba(239, 68, 68, 0.18)',
  });
  return chart.addSeries(CandlestickSeries, {
    upColor: '#22c55e', downColor: '#ef4444', borderVisible: false,
    wickUpColor: '#22c55e', wickDownColor: '#ef4444',
  });
}

export default function TradingChart({
  bars,
  chartType,
  indicators = [],
  symbol,
  height = 480,
  onCrosshairMove,
}: {
  bars: readonly MarketBar[];
  chartType: ChartType;
  indicators?: OverlayIndicator[];
  symbol: string;
  height?: number | string;
  onCrosshairMove?: (bar: MarketBar | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<MainSeries | null>(null);
  const overlaySeriesRef = useRef<ISeriesApi<'Line'>[]>([]);
  const callbackRef = useRef(onCrosshairMove);
  const barsRef = useRef(bars);
  callbackRef.current = onCrosshairMove;
  barsRef.current = bars;

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, DEFAULT_CHART_OPTIONS);
    chartRef.current = chart;
    seriesRef.current = makeSeries(chart, chartType);
    chart.subscribeCrosshairMove((param) => {
      const datum = param.seriesData.get(seriesRef.current as MainSeries) as { time?: number } | undefined;
      const time = datum?.time === undefined ? null : Number(datum.time);
      callbackRef.current?.(time === null ? null : barsRef.current.find((bar) => bar.time === time) || null);
    });
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // Chart lifetime is tied to its host element; data and options update below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (seriesRef.current) chart.removeSeries(seriesRef.current);
    seriesRef.current = makeSeries(chart, chartType);
    setBars();
    // Chart type changes replace only the series, preserving the chart instance and viewport.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType]);

  useEffect(() => {
    setBars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, symbol]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    for (const overlay of overlaySeriesRef.current) chart.removeSeries(overlay);
    overlaySeriesRef.current = [];
    if (!bars.length) return;

    const closes = bars.map((bar) => bar.close);
    const available: Record<OverlayIndicator, (number | null)[]> = {
      SMA20: sma(closes, 20),
      EMA20: ema(closes, 20),
      VWAP: sessionVwap(bars),
    };
    const colors: Record<OverlayIndicator, string> = { SMA20: '#fbbf24', EMA20: '#c084fc', VWAP: '#38bdf8' };
    for (const indicator of indicators) {
      const overlay = chart.addSeries(LineSeries, {
        color: colors[indicator], lineWidth: 1, title: indicator, crosshairMarkerVisible: false, lastValueVisible: true,
      });
      overlay.setData(bars.flatMap((bar, index) => {
        const value = available[indicator][index];
        return value === null ? [] : [{ time: bar.time as UTCTimestamp, value }];
      }));
      overlaySeriesRef.current.push(overlay);
    }
  }, [bars, indicators, symbol]);

  function setBars() {
    const series = seriesRef.current;
    if (!series) return;
    const clean = bars.filter(isValidBar).slice().sort((a, b) => a.time - b.time);
    const unique = clean.filter((bar, index) => index === 0 || bar.time > clean[index - 1].time);
    const data = unique.map((bar) => ({ ...bar, time: bar.time as UTCTimestamp }));
    const isSingleValue = chartType === 'line' || chartType === 'area' || chartType === 'baseline';
    series.setData((isSingleValue ? data.map(({ time, close }) => ({ time, value: close })) : data) as never[]);
  }

  return (
    <div className="relative w-full overflow-hidden bg-[#0b0e14]" style={{ height }} aria-label={`${symbol} market chart`}>
      <div ref={containerRef} className="absolute inset-0" />
      {bars.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-max-text-muted">
          Waiting for verified historical market data
        </div>
      )}
    </div>
  );
}

function isValidBar(bar: MarketBar): boolean {
  return Number.isFinite(bar.time)
    && bar.time > 0
    && [bar.open, bar.high, bar.low, bar.close, bar.volume].every(Number.isFinite)
    && bar.low <= Math.min(bar.open, bar.close)
    && bar.high >= Math.max(bar.open, bar.close)
    && bar.low <= bar.high
    && bar.volume >= 0;
}
