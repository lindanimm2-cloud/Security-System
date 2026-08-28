export type ChartTone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export type ChartSlice = {
  label: string;
  value: number;
  tone?: ChartTone;
  color?: string;
};

const TONE_COLORS: Record<ChartTone, string> = {
  accent: 'var(--accent)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  neutral: '#64748b',
  info: '#38bdf8',
};

export function sliceColor(slice: ChartSlice, index: number): string {
  if (slice.color) return slice.color;
  if (slice.tone) return TONE_COLORS[slice.tone];
  const palette: ChartTone[] = ['accent', 'success', 'warning', 'info', 'neutral', 'danger'];
  return TONE_COLORS[palette[index % palette.length]];
}

export function countBy<T>(
  items: T[],
  keyFn: (item: T) => string,
  labelFn?: (key: string) => string,
): ChartSlice[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([key, value]) => ({
      label: labelFn ? labelFn(key) : key.replaceAll('_', ' '),
      value,
    }))
    .sort((a, b) => b.value - a.value);
}

export function bucketByDay<T>(
  items: T[],
  dateFn: (item: T) => string | Date,
  days = 7,
): { label: string; value: number }[] {
  const now = new Date();
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    d.setHours(0, 0, 0, 0);
    return {
      date: d,
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
      value: 0,
    };
  });

  for (const item of items) {
    const raw = dateFn(item);
    const date = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(date.getTime())) continue;
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const bucket = buckets.find((b) => b.date.getTime() === dayStart.getTime());
    if (bucket) bucket.value += 1;
  }

  return buckets.map(({ label, value }) => ({ label, value }));
}

export function sumSlices(slices: ChartSlice[]): number {
  return slices.reduce((sum, slice) => sum + slice.value, 0);
}

export function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}
