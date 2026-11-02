// Which fields a check-in asks for.
// Impact KPIs are quarterly. Annual fields (PAI inputs) are asked in the Q4 check-in, which is filed
// after 31 Dec and covers the calendar year, matching the RTS reference period. One-time fields are
// collected at investment and never in a check-in.
import { comparePeriods, parseQuarter, prevQuarter } from './period';
import type { Metric, Value } from './types';
import { findValue, latestValue } from './values';

export function isDue(metric: Metric, quarter: string): boolean {
  if (metric.cadence === 'quarterly') return true;
  if (metric.cadence === 'annual') return parseQuarter(quarter).index === 4;
  return false;
}

/** The period a metric reports for in a given check-in: the quarter, or the year for annual fields. */
export function periodFor(metric: Metric, quarter: string): string {
  return metric.cadence === 'annual' ? String(parseQuarter(quarter).year) : quarter;
}

export function previousPeriod(metric: Metric, period: string): string {
  return metric.cadence === 'annual' ? String(Number(period) - 1) : prevQuarter(period);
}

/** Metrics that apply to a company: its own KPIs plus the portfolio-wide fields. */
export const metricsFor = (metrics: Metric[], companyId: string) =>
  metrics.filter((m) => m.companyId === companyId || m.companyId === undefined);

export const dueMetrics = (metrics: Metric[], companyId: string, quarter: string) =>
  metricsFor(metrics, companyId).filter((m) => isDue(m, quarter));

/** Annual fields that will join the Q4 check-in; 0 when the current check-in is already Q4. */
export function upcomingAnnualCount(metrics: Metric[], companyId: string, quarter: string): number {
  if (parseQuarter(quarter).index === 4) return 0;
  return metricsFor(metrics, companyId).filter((m) => m.cadence === 'annual').length;
}

/**
 * Pre-fill: the value already given for this period if there is one (a draft or a queried value
 * being answered), otherwise the value from the previous period. Queried values count: the founder
 * gave them, and the impact team's note is shown next to them.
 */
export function prefill(values: Value[], metric: Metric, companyId: string, quarter: string): { value: Value | undefined; fromPeriod?: string } {
  const period = periodFor(metric, quarter);
  const own = findValue(values, metric.id, companyId, period);
  if (own) return { value: own, fromPeriod: period };
  const prev = previousPeriod(metric, period);
  const last = findValue(values, metric.id, companyId, prev) ?? latestValue(values, metric.id, companyId, (v) => comparePeriods(v.period, period) < 0);
  return { value: last, fromPeriod: last?.period };
}
