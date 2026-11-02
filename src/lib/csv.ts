// Export in a reporting shape: one row per reported value. The extra columns let a
// reader recompute both portfolio figures (vs this year's and vs the long-term target) from the
// file alone: actual ÷ target per KPI, weighted within the company, then by invested capital
// (EIF Gamma Model). csv.test.ts recomputes them from the seed export.
import type { DemoState } from './types';
import { comparePeriods, isQuarter, yearOfPeriod } from './period';

export const EXPORT_COLUMNS = [
  'company',
  'fund',
  'invested_capital_eur',
  'metric',
  'kpi_type',
  'kpi_weight',
  'definition',
  'value',
  'unit',
  'period',
  'direction',
  'target_for_year',
  'long_term_target',
  'long_term_target_year',
  'estimate',
  'evidence_note',
  'review_status',
  'submitted_at',
  'reviewed_at',
  'pai_indicator',
] as const;

const cell = (x: unknown) => {
  const s = x === undefined || x === null ? '' : typeof x === 'boolean' ? (x ? 'yes' : 'no') : String(x);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportCsv(state: Pick<DemoState, 'companies' | 'metrics' | 'values'>): string {
  const rows = state.values
    .filter((v) => v.status !== 'draft')
    .map((v) => ({ v, c: state.companies.find((c) => c.id === v.companyId), m: state.metrics.find((m) => m.id === v.metricId) }))
    .filter((r) => r.c && r.m)
    .sort((a, b) => a.c!.name.localeCompare(b.c!.name) || a.m!.label.localeCompare(b.m!.label) || comparePeriods(a.v.period, b.v.period))
    .map(({ v, c, m }) =>
      [
        c!.name,
        c!.fund,
        c!.investedCapitalEUR,
        m!.label,
        m!.kind === 'impact_kpi' ? (m!.kpiType ?? '') : 'adverse_impact',
        m!.kind === 'impact_kpi' ? (m!.weight ?? 0) : '',
        m!.definition,
        v.value,
        m!.unit,
        v.period,
        m!.direction,
        isQuarter(v.period) ? (m!.annualTargets?.[yearOfPeriod(v.period)] ?? '') : '',
        m!.longTermTarget ?? '',
        m!.longTermTargetYear ?? '',
        v.isEstimate,
        v.evidenceNote ?? v.comment ?? '',
        v.status,
        v.submittedAt ?? '',
        v.reviewedAt ?? '',
        m!.paiIndicator ?? '',
      ]
        .map(cell)
        .join(','),
    );
  return [EXPORT_COLUMNS.join(','), ...rows].join('\n') + '\n';
}
