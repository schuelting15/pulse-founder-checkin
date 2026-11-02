// In-year impact status per KPI. This is Pulse's early warning, not the annual measure of
// achievement against target. See aggregate.ts for that.
import { STATUS_THRESHOLDS } from './config';
import { parseQuarter } from './period';
import type { Metric, Value } from './types';
import { asNumber, findValue, isReported, reportedInYear } from './values';

export type Status = 'on_track' | 'at_risk' | 'off_track' | 'missing';

/** Share of the way from baseline to target. Works for reduction targets too (both terms negative). */
export function progress(value: number, baseline: number, target: number, direction: Metric['direction'] = 'increase'): number {
  // A target equal to the baseline means "hold the line": reached (1) or not (0).
  if (target === baseline) return (direction === 'increase' ? value >= target : value <= target) ? 1 : 0;
  return (value - baseline) / (target - baseline);
}

export function statusFromProgress(p: number, quarterIndex: number, t = STATUS_THRESHOLDS): Exclude<Status, 'missing'> {
  const expected = quarterIndex / 4;
  if (p >= expected - t.onTrackSlack) return 'on_track';
  if (p >= expected - t.atRiskSlack) return 'at_risk';
  return 'off_track';
}

export interface KpiStatus {
  status: Status;
  value?: number;
  baseline?: number;
  target?: number;
  progress?: number;
  expected: number;
}

/**
 * Status of one KPI in a quarter. Baseline = last reported value of the previous year (its end-of-year
 * position); target = this year's end-of-year target. `draft` lets the check-in form show a live badge.
 */
export function kpiStatus(metric: Metric, companyId: string, quarter: string, values: Value[], draft?: number | null): KpiStatus {
  const { year, index } = parseQuarter(quarter);
  const expected = index / 4;
  const target = metric.annualTargets?.[year];
  const baseline = asNumber(reportedInYear(values, metric.id, companyId, year - 1)) ?? (metric.cumulative ? 0 : undefined);
  const current = findValue(values, metric.id, companyId, quarter);
  const value = draft !== undefined ? (draft ?? undefined) : current && isReported(current) ? asNumber(current) : undefined;
  if (value === undefined || target === undefined || baseline === undefined) return { status: 'missing', value, baseline, target, expected };
  const p = progress(value, baseline, target, metric.direction);
  return { status: statusFromProgress(p, index), value, baseline, target, progress: p, expected };
}

const SEVERITY: Record<Status, number> = { on_track: 0, at_risk: 1, off_track: 2, missing: 3 };
export const worstStatus = (statuses: Status[]): Status =>
  statuses.reduce<Status>((w, s) => (SEVERITY[s] > SEVERITY[w] ? s : w), 'on_track');

/** Impact KPIs that decide a company's status: everything except operational KPIs. */
export const statusKpis = (metrics: Metric[], companyId: string) =>
  metrics.filter((m) => m.companyId === companyId && m.kind === 'impact_kpi' && m.kpiType !== 'operational');

/** A company's status is its worst impact KPI. No KPIs → missing. */
export function companyStatus(metrics: Metric[], values: Value[], companyId: string, quarter: string): Status {
  const kpis = statusKpis(metrics, companyId);
  if (kpis.length === 0) return 'missing';
  return worstStatus(kpis.map((m) => kpiStatus(m, companyId, quarter, values).status));
}
