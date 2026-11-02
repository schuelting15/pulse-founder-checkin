// Source check: every adverse-impact field must carry the RTS wording exactly, as
// transcribed programmatically from EUR-Lex into research/pai_table1.json.
import { describe, expect, it } from 'vitest';
import pai from '../../research/pai_table1.json';
import { paiMetrics } from './pai';

type Input = { id: string; label: string; unit: string };
type Row = { ref: string; indicator: string; metric: string | string[]; companyInputs: Input[] };
const rows: Row[] = [...(pai.indicators as Row[]), ...(pai.optionalIndicators as Row[])];

describe('adverse-impact fields match the RTS transcription', () => {
  it('covers every founder input in the transcription, once', () => {
    const inputs = rows.flatMap((r) => r.companyInputs.map((i) => `pai_${i.id}`));
    expect(paiMetrics.map((m) => m.id).sort()).toEqual([...inputs].sort());
    expect(new Set(inputs).size).toBe(inputs.length);
  });

  it.each(rows.flatMap((r) => r.companyInputs.map((i) => [r.ref, i.id, r, i] as const)))('%s %s: label, unit, indicator, metric', (_ref, id, row, input) => {
    const m = paiMetrics.find((x) => x.id === `pai_${id}`)!;
    expect(m.label).toBe(input.label);
    expect(m.unit).toBe(input.unit);
    expect(m.paiIndicator).toBe(row.ref);
    expect(m.paiIndicatorName).toBe(row.indicator);
    expect(m.paiMetric).toBe(Array.isArray(row.metric) ? row.metric.join('; ') : row.metric);
    expect(m.cadence).toBe('annual');
  });

  it('spot-checks three rows against the RTS text itself', () => {
    const byRef = (ref: string) => rows.find((r) => r.ref === ref)!;
    expect(byRef('Table 1, #13').indicator).toBe('Board gender diversity');
    expect(byRef('Table 1, #13').metric).toBe('Average ratio of female to male board members in investee companies, expressed as a percentage of all board members');
    expect(byRef('Table 1, #1').metric).toEqual(['Scope 1 GHG emissions', 'Scope 2 GHG emissions', 'Scope 3 GHG emissions', 'Total GHG emissions']);
    expect(byRef('Table 1, #11').indicator).toBe(
      'Lack of processes and compliance mechanisms to monitor compliance with UN Global Compact principles and OECD Guidelines for Multinational Enterprises',
    );
  });
});
