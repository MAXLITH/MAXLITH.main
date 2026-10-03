import { ColorType, CrosshairMode, PriceScaleMode, type DeepPartial, type ChartOptions } from 'lightweight-charts';

export { RESOLUTIONS } from './resolutions';
export type { Resolution } from './resolutions';

export type ChartType = 'candlestick' | 'bar' | 'line' | 'area' | 'baseline';

export const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'candlestick', label: 'Candles' },
  { value: 'bar', label: 'Bars' },
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'baseline', label: 'Baseline' },
];

export const DEFAULT_CHART_OPTIONS: DeepPartial<ChartOptions> = {
  autoSize: true,
  layout: {
    background: { type: ColorType.Solid, color: '#0b0e14' },
    textColor: '#94a3b8',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 11,
    attributionLogo: true,
  },
  grid: {
    vertLines: { color: 'rgba(148, 163, 184, 0.08)' },
    horzLines: { color: 'rgba(148, 163, 184, 0.08)' },
  },
  crosshair: { mode: CrosshairMode.Magnet },
  rightPriceScale: {
    borderColor: 'rgba(148, 163, 184, 0.18)',
    mode: PriceScaleMode.Normal,
    scaleMargins: { top: 0.08, bottom: 0.08 },
  },
  timeScale: {
    borderColor: 'rgba(148, 163, 184, 0.18)',
    timeVisible: true,
    secondsVisible: false,
    rightOffset: 8,
  },
  localization: { locale: 'en-IN' },
  handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
  handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
};
