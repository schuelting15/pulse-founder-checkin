import { comparePeriods, isQuarter, yearOfPeriod } from './period';
import type { Value } from './types';

/** A value counts once the founder submitted it; queried values wait for an answer. */
export const isReported = (v: Value) => v.status === 'submitted' || v.status === 'accepted';

export function findValue(values: Value[], metricId: string, companyId: string, period: string): Value | undefined {
  return values.find((v) => v.metricId === metricId && v.companyId === companyId && v.period === period);
}

/** Latest value for a metric matching `filter`, by period. */
export function latestValue(
  values: Value[],
  metricId: string,
  companyId: string,
  filter: (v: Value) => boolean = () => true,
): Value | undefined {
  return values
    .filter((v) => v.metricId === metricId && v.companyId === companyId && filter(v))
    .sort((a, b) => comparePeriods(a.period, b.period))
    .at(-1);
}

/** Latest reported value at or before `period`. */
export const reportedUpTo = (values: Value[], metricId: string, companyId: string, period: string) =>
  latestValue(values, metricId, companyId, (v) => isReported(v) && comparePeriods(v.period, period) <= 0);

/** Latest reported quarterly value within a calendar year. */
export const reportedInYear = (values: Value[], metricId: string, companyId: string, year: number) =>
  latestValue(values, metricId, companyId, (v) => isReported(v) && isQuarter(v.period) && yearOfPeriod(v.period) === year);

export const asNumber = (v: Value | undefined): number | undefined => (typeof v?.value === 'number' ? v.value : undefined);
