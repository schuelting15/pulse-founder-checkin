// Quarter and year helpers. Periods are '2026-Q3' (quarterly) or '2026' (annual).

export function parseQuarter(q: string): { year: number; index: 1 | 2 | 3 | 4 } {
  const m = /^(\d{4})-Q([1-4])$/.exec(q);
  if (!m) throw new Error(`Not a quarter: ${q}`);
  return { year: Number(m[1]), index: Number(m[2]) as 1 | 2 | 3 | 4 };
}

export const isQuarter = (p: string) => /^\d{4}-Q[1-4]$/.test(p);
export const quarterOf = (year: number, index: number) => `${year}-Q${index}`;
export const yearOfPeriod = (p: string) => Number(p.slice(0, 4));

export function prevQuarter(q: string): string {
  const { year, index } = parseQuarter(q);
  return index === 1 ? quarterOf(year - 1, 4) : quarterOf(year, index - 1);
}

export function nextQuarter(q: string): string {
  const { year, index } = parseQuarter(q);
  return index === 4 ? quarterOf(year + 1, 1) : quarterOf(year, index + 1);
}

/** Chronological order for '2025-Q4' < '2026-Q1' and '2025' < '2026'. */
export function comparePeriods(a: string, b: string): number {
  const key = (p: string) => (isQuarter(p) ? parseQuarter(p).year * 10 + parseQuarter(p).index : Number(p) * 10 + 5);
  return key(a) - key(b);
}

/** The quarters from `from` to `to`, inclusive. */
export function quarterRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let q = from; comparePeriods(q, to) <= 0; q = nextQuarter(q)) out.push(q);
  return out;
}

/** Last day of a quarter, as an ISO date. */
export function quarterEnd(q: string): string {
  const { year, index } = parseQuarter(q);
  const month = index * 3; // 3, 6, 9, 12
  const last = new Date(Date.UTC(year, month, 0));
  return last.toISOString().slice(0, 10);
}
