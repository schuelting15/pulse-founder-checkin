// The export claims a reader can recompute both portfolio figures from the file alone.
// This test does exactly that: it parses the seed export with no access to the app's types or rules,
// recomputes the per-fund figures the way a spreadsheet would, and compares them with aggregate.ts.
import { describe, expect, it } from 'vitest';
import { createSeed } from '../data/seed';
import { achievementByFund } from './aggregate';
import { CURRENT_QUARTER } from './config';
import { exportCsv } from './csv';

/** Minimal RFC 4180 parser: quoted cells, doubled quotes, commas inside quotes. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') row.push(cell), (cell = '');
    else if (ch === '\n') row.push(cell), rows.push(row), (row = []), (cell = '');
    else cell += ch;
  }
  const [header, ...body] = rows;
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

type Row = Record<string, string>;
const latest = (rows: Row[]) => [...rows].sort((a, b) => a.period.localeCompare(b.period)).at(-1);

/** Spreadsheet-style recomputation: actual ÷ target per KPI, weighted in the company, then by capital. */
function recompute(rows: Row[], mode: { year: number } | { upTo: string }): number {
  const reported = rows.filter((r) => r.review_status === 'submitted' || r.review_status === 'accepted');
  const weighted = reported.filter((r) => r.kpi_type !== 'adverse_impact' && Number(r.kpi_weight) > 0);
  const byCompany = new Map<string, Row[]>();
  for (const r of weighted) byCompany.set(r.company, [...(byCompany.get(r.company) ?? []), r]);
  let num = 0;
  let den = 0;
  for (const [, companyRows] of byCompany) {
    let cNum = 0;
    let cDen = 0;
    for (const metric of new Set(companyRows.map((r) => r.metric))) {
      const series = companyRows.filter((r) => r.metric === metric && r.period.includes('-Q'));
      let row: Row | undefined;
      let ratio: number | undefined;
      if ('year' in mode) {
        row = latest(series.filter((r) => r.period.startsWith(`${mode.year}-`)));
        if (!row || row.target_for_year === '') continue;
        const [actual, target] = [Number(row.value), Number(row.target_for_year)];
        if (row.direction === 'increase') ratio = target > 0 ? actual / target : undefined;
        else {
          const base = latest(series.filter((r) => r.period.startsWith(`${mode.year - 1}-`)));
          if (base && Number(base.value) !== target) ratio = (Number(base.value) - actual) / (Number(base.value) - target);
        }
      } else {
        row = latest(series.filter((r) => r.period <= mode.upTo));
        if (!row || row.long_term_target === '' || row.direction !== 'increase') continue;
        ratio = Number(row.value) / Number(row.long_term_target);
      }
      if (ratio === undefined) continue;
      cNum += Number(row.kpi_weight) * ratio;
      cDen += Number(row.kpi_weight);
    }
    if (cDen === 0) continue;
    const capital = Number(companyRows[0].invested_capital_eur);
    num += capital * (cNum / cDen);
    den += capital;
  }
  return num / den;
}

describe('the export reproduces the Impact Review figures', () => {
  const s = createSeed();
  const rows = parseCsv(exportCsv(s));

  it('parses every non-draft value into one row', () => {
    expect(rows).toHaveLength(s.values.filter((v) => v.status !== 'draft').length);
  });

  // One figure per fund, as the Impact Review shows them: the file's fund column splits the rows.
  const funds = achievementByFund(s.companies, s.metrics, s.values, { kind: 'annual', year: 2025 }).map((f) => f.fund);
  const inFund = (fund: string) => rows.filter((r) => r.fund === fund);

  it.each(funds.flatMap((fund) => [2025, 2026].map((year) => [fund, year] as const)))('%s vs the %i year-end target', (fund, year) => {
    const app = achievementByFund(s.companies, s.metrics, s.values, { kind: 'annual', year }).find((f) => f.fund === fund)!.ratio!;
    expect(recompute(inFund(fund), { year })).toBeCloseTo(app, 10);
  });

  it.each(funds)('%s vs the long-term target', (fund) => {
    const app = achievementByFund(s.companies, s.metrics, s.values, { kind: 'longTerm', upTo: CURRENT_QUARTER }).find((f) => f.fund === fund)!.ratio!;
    expect(recompute(inFund(fund), { upTo: CURRENT_QUARTER })).toBeCloseTo(app, 10);
  });
});
