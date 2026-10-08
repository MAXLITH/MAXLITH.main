'use client';

import { CHART_TYPES, RESOLUTIONS, type ChartType, type Resolution } from '@/lib/tradingview/chartConfig';
import type { OverlayIndicator } from './TradingChart';

export default function ChartToolbar({
  chartType,
  resolution,
  indicators,
  onChartTypeChange,
  onResolutionChange,
  onIndicatorsChange,
}: {
  chartType: ChartType;
  resolution: Resolution;
  indicators: OverlayIndicator[];
  onChartTypeChange: (value: ChartType) => void;
  onResolutionChange: (value: Resolution) => void;
  onIndicatorsChange: (value: OverlayIndicator[]) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Chart controls">
      <label className="sr-only" htmlFor="chart-type">Chart type</label>
      <select
        id="chart-type"
        value={chartType}
        onChange={(event) => onChartTypeChange(event.target.value as ChartType)}
        className="h-7 rounded border border-max-border bg-max-surface px-2 text-[11px] text-max-text-primary outline-none focus:border-max-brand-primary"
      >
        {CHART_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
      </select>
      <details className="relative">
        <summary className="flex h-7 cursor-pointer list-none items-center rounded border border-max-border bg-max-surface px-2 text-[11px] text-max-text-primary hover:bg-max-surface-hover">Indicators{indicators.length ? ` · ${indicators.length}` : ''}</summary>
        <div className="absolute left-0 top-8 z-20 w-44 rounded border border-max-border bg-max-bg-elevated p-2 shadow-lg font-mono">
          {(['SMA20', 'EMA20', 'VWAP'] as const).map((indicator) => (
            <label key={indicator} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[10px] text-max-text-primary hover:bg-max-surface-hover">
              <input type="checkbox" checked={indicators.includes(indicator)} onChange={(event) => onIndicatorsChange(event.target.checked ? [...indicators, indicator] : indicators.filter((item) => item !== indicator))} className="accent-max-brand-primary" />
              {indicator}
            </label>
          ))}
          <p className="px-1.5 pt-1 text-[8px] text-max-text-muted border-t border-max-border mt-1">Calculated from verified OHLCV</p>
        </div>
      </details>
      <div className="flex items-center gap-0.5 overflow-x-auto" role="group" aria-label="Chart timeframe">
        {RESOLUTIONS.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={resolution === item.value}
            onClick={() => onResolutionChange(item.value)}
            className={`h-7 min-w-7 rounded px-2 text-[11px] font-mono font-medium transition-colors ${
              resolution === item.value ? 'bg-max-brand-primary/20 text-max-brand-primary font-bold' : 'text-max-text-secondary hover:bg-max-surface-hover hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
