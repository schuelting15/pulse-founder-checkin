// Actual vs target path for one KPI through the current year (founder card and company drawer).
import type { SparkPoint } from '../components/Sparkline';
import { parseQuarter, quarterOf } from './period';
import type { Metric, Value } from './types';
import { asNumber, findValue, isReported, reportedInYear } from './values';

/**
 * Points from last year's Q4 (the baseline) to this year's Q4. The target path runs in a straight line
 * from the baseline to the end-of-year target. `draft` replaces the current quarter's actual.
 */
export function kpiSeries(metric: Metric, companyId: string, values: Value[], quarter: string, draft?: number | null): SparkPoint[] {
  const { year, index } = parseQuarter(quarter);
  const baseline = asNumber(reportedInYear(values, metric.id, companyId, year - 1));
  const target = metric.annualTargets?.[year];
  const points: SparkPoint[] = [{ period: quarterOf(year - 1, 4), actual: baseline, target: baseline }];
  for (let i = 1; i <= 4; i++) {
    const period = quarterOf(year, i);
    const v = findValue(values, metric.id, companyId, period);
    let actual = v && (isReported(v) || v.status === 'queried') ? asNumber(v) : undefined;
    if (i === index && draft !== undefined) actual = draft ?? undefined;
    if (i > index) actual = undefined;
    const t = baseline !== undefined && target !== undefined ? baseline + ((target - baseline) * i) / 4 : undefined;
    points.push({ period, actual, target: t });
  }
  return points;
}
