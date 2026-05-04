export const DESKTOP_THRESHOLDS = {
  performance: 50,
  accessibility: 85,
  'best-practices': 90,
  seo: 85,
};

export const MOBILE_THRESHOLDS = {
  performance: 25,
  accessibility: 85,
  'best-practices': 90,
  seo: 85,
};

export function thresholdMsg(label: string, formFactor: string, score: number, threshold: number): string {
  const status = score >= threshold ? '✓' : '✗';
  return `${score} ${status} (threshold: ${threshold}) [${label}]`;
}
