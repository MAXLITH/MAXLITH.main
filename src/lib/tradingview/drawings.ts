export type DrawingTool =
  | 'trend-line'
  | 'horizontal-line'
  | 'vertical-line'
  | 'ray'
  | 'extended-line'
  | 'parallel-channel'
  | 'rectangle'
  | 'circle'
  | 'arrow'
  | 'text'
  | 'price-range'
  | 'date-range'
  | 'fibonacci-retracement'
  | 'fibonacci-extension'
  | 'pitchfork';

export interface ChartAnchor {
  time: number;
  price: number;
}

export interface ChartDrawing {
  id: string;
  userId: string;
  layoutId: string;
  symbolId: string;
  tool: DrawingTool;
  anchors: ChartAnchor[];
  color: string;
  lineWidth: number;
  text?: string;
  createdAt: string;
  updatedAt: string;
}

const DRAWING_TOOLS = new Set<DrawingTool>([
  'trend-line', 'horizontal-line', 'vertical-line', 'ray', 'extended-line', 'parallel-channel',
  'rectangle', 'circle', 'arrow', 'text', 'price-range', 'date-range', 'fibonacci-retracement',
  'fibonacci-extension', 'pitchfork',
]);

export function validateDrawing(value: unknown): value is ChartDrawing {
  if (!value || typeof value !== 'object') return false;
  const drawing = value as Partial<ChartDrawing>;
  return typeof drawing.id === 'string'
    && typeof drawing.userId === 'string'
    && typeof drawing.layoutId === 'string'
    && typeof drawing.symbolId === 'string'
    && DRAWING_TOOLS.has(drawing.tool as DrawingTool)
    && Array.isArray(drawing.anchors)
    && drawing.anchors.length >= 1
    && drawing.anchors.every((anchor) => Number.isFinite(anchor.time) && Number.isFinite(anchor.price))
    && typeof drawing.color === 'string'
    && Number.isInteger(drawing.lineWidth)
    && typeof drawing.createdAt === 'string'
    && typeof drawing.updatedAt === 'string';
}

export function serializeDrawings(drawings: readonly ChartDrawing[]): string {
  if (!drawings.every(validateDrawing)) throw new Error('Cannot persist invalid chart drawings');
  return JSON.stringify(drawings);
}

export function parseDrawings(payload: string): ChartDrawing[] {
  const parsed: unknown = JSON.parse(payload);
  if (!Array.isArray(parsed) || !parsed.every(validateDrawing)) throw new Error('Invalid saved drawing payload');
  return parsed;
}
