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
        className="h-8 rounded border border-slate-700 bg-[#101723] px-2 text-[11px] text-slate-200 outline-none focus:border-blue-500"
      >
        {CHART_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
      </select>
      <details className="relative">
        <summary className="flex h-8 cursor-pointer list-none items-center rounded border border-slate-700 bg-[#101723] px-2 text-[11px] text-slate-300 hover:border-slate-600">Indicators{indicators.length ? ` · ${indicators.length}` : ''}</summary>
        <div className="absolute left-0 top-9 z-20 w-40 rounded border border-slate-700 bg-[#111821] p-2 shadow-xl">
          {(['SMA20', 'EMA20', 'VWAP'] as const).map((indicator) => (
            <label key={indicator} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1.5 text-[10px] text-slate-300 hover:bg-slate-800">
              <input type="checkbox" checked={indicators.includes(indicator)} onChange={(event) => onIndicatorsChange(event.target.checked ? [...indicators, indicator] : indicators.filter((item) => item !== indicator))} />
              {indicator}
            </label>
          ))}
          <p className="px-1.5 pt-1 text-[8px] text-slate-600">Overlay indicators · calculated from verified OHLCV</p>
        </div>
      </details>
      <div className="flex items-center gap-0.5 overflow-x-auto" role="group" aria-label="Chart timeframe">
        {RESOLUTIONS.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={resolution === item.value}
            onClick={() => onResolutionChange(item.value)}
            className={`h-8 min-w-8 rounded px-2 text-[11px] font-medium transition-colors ${
              resolution === item.value ? 'bg-blue-600/20 text-blue-300' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
