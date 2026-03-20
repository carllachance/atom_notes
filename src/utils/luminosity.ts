// Luminosity computation utilities — pure functions, no React

const BREAKPOINTS: Array<[days: number, lum: number]> = [
  [0, 1.00],
  [3, 0.85],
  [7, 0.70],
  [30, 0.50],
  [90, 0.35],
  [365, 0.22],
];

const LUM_FLOOR = 0.15;
const LUM_CEIL = 1.0;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function daysSince(isoString: string): number {
  return (Date.now() - Date.parse(isoString)) / 86400000;
}

export function computeRecencyLuminosity(lastViewedAt: string | null, updatedAt: string): number {
  const mostRecent = lastViewedAt
    ? Math.max(Date.parse(lastViewedAt), Date.parse(updatedAt))
    : Date.parse(updatedAt);
  const days = (Date.now() - mostRecent) / 86400000;

  if (days <= 0) return LUM_CEIL;
  if (days >= 365) return LUM_FLOOR;

  for (let i = 1; i < BREAKPOINTS.length; i++) {
    const [d0, l0] = BREAKPOINTS[i - 1];
    const [d1, l1] = BREAKPOINTS[i];
    if (days <= d1) {
      const t = (days - d0) / (d1 - d0);
      return clamp(l0 + t * (l1 - l0), LUM_FLOOR, LUM_CEIL);
    }
  }

  return LUM_FLOOR;
}

export function computeSizeFactor(reinforcementScore: number): number {
  // 0.0 → 0.85, 0.5 → 1.0, 1.0 → 1.15
  return clamp(0.85 + reinforcementScore * 0.30, 0.85, 1.15);
}

export function luminosityToOpacity(luminosity: number): number {
  return clamp(luminosity, 0.15, 1.0);
}

export function luminosityToFilter(luminosity: number): string {
  if (luminosity < 0.70) {
    return `brightness(${luminosity})`;
  }
  return '';
}
