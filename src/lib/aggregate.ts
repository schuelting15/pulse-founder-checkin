// Portfolio aggregate: impact achieved vs this year's target and vs the long-term target,
// weighted by invested capital. Computed as in the EIF Gamma Model, whose handbook gives
// outcome ÷ target, capital-weighted per fund (EIF Gamma Model handbook, pp.8, 16–17).
import type { Company, Metric, Value } from './types';
import { asNumber, reportedInYear, reportedUpTo } from './values';

/** actual ÷ target, uncapped (published figures exceed 100%). Reductions use the progress form. */
export function achievementRatio(actual: number, target: number, direction: Metric['direction'], baseline?: number): number | null {
  if (direction === 'increase') return target > 0 ? actual / target : null;
  if (baseline === undefined || baseline === target) return null;
  return (baseline - actual) / (baseline - target);
}

export type AggregateMode = { kind: 'annual'; year: number } | { kind: 'longTerm'; upTo: string };

export interface CompanyAchievement {
  companyId: string;
  ratio: number | null;
  parts: { metricId: string; weight: number; actual?: number; target?: number; ratio: number | null }[];
}

/** Σ weight·ratio / Σ weight over the company's weighted KPIs with data. */
export function companyAchievement(company: Company, metrics: Metric[], values: Value[], mode: AggregateMode): CompanyAchievement {
  const kpis = metrics.filter((m) => m.companyId === company.id && m.kind === 'impact_kpi' && (m.weight ?? 0) > 0);
  const parts = kpis.map((m) => {
    const weight = m.weight ?? 0;
    const actual =
      mode.kind === 'annual'
        ? asNumber(reportedInYear(values, m.id, company.id, mode.year))
        : asNumber(reportedUpTo(values, m.id, company.id, mode.upTo));
    const target = mode.kind === 'annual' ? m.annualTargets?.[mode.year] : m.longTermTarget;
    const baseline = mode.kind === 'annual' ? asNumber(reportedInYear(values, m.id, company.id, mode.year - 1)) : undefined;
    const ratio = actual === undefined || target === undefined ? null : achievementRatio(actual, target, m.direction, baseline);
    return { metricId: m.id, weight, actual, target, ratio };
  });
  const usable = parts.filter((p) => p.ratio !== null);
  const w = usable.reduce((s, p) => s + p.weight, 0);
  return { companyId: company.id, ratio: w > 0 ? usable.reduce((s, p) => s + p.weight * (p.ratio as number), 0) / w : null, parts };
}

export interface PortfolioAchievement {
  ratio: number | null;
  companiesIncluded: number;
  companiesTotal: number;
  byCompany: CompanyAchievement[];
}

/** Σ invested capital · company achievement / Σ invested capital, over companies with data. */
export function portfolioAchievement(companies: Company[], metrics: Metric[], values: Value[], mode: AggregateMode): PortfolioAchievement {
  const byCompany = companies.map((c) => companyAchievement(c, metrics, values, mode));
  let num = 0;
  let den = 0;
  byCompany.forEach((a, i) => {
    if (a.ratio === null) return;
    num += companies[i].investedCapitalEUR * a.ratio;
    den += companies[i].investedCapitalEUR;
  });
  return {
    ratio: den > 0 ? num / den : null,
    companiesIncluded: byCompany.filter((a) => a.ratio !== null).length,
    companiesTotal: companies.length,
    byCompany,
  };
}

/**
 * One figure per fund, never pooled: the Gamma Model's Fund Level Impact Multiple is computed per
 * fund because carry is (EIF Gamma Model handbook, p.8). Newest fund first.
 */
export function achievementByFund(companies: Company[], metrics: Metric[], values: Value[], mode: AggregateMode) {
  const funds = [...new Set(companies.map((c) => c.fund))].sort().reverse();
  return funds.map((fund) => ({ fund, ...portfolioAchievement(companies.filter((c) => c.fund === fund), metrics, values, mode) }));
}
