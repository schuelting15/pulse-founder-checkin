import { describe, expect, it } from 'vitest';
import { exportCsv, EXPORT_COLUMNS } from './csv';
import { kpi, val, company } from './fixtures.test-helpers';
import { fmtDuration, median, parseNumberInput, readingEcho } from './format';
import { comparePeriods, prevQuarter, quarterRange } from './period';
import type { Metric } from './types';
import { requestSchema, valueSchema } from './schema';

describe('parseNumberInput', () => {
  it('reads thousands separators and decimal commas', () => {
    expect(parseNumberInput('1,010')).toBe(1010);
    expect(parseNumberInput('1 010')).toBe(1010);
    expect(parseNumberInput('12,345,678')).toBe(12345678);
    expect(parseNumberInput('1,5')).toBe(1.5);
    expect(parseNumberInput('1.5')).toBe(1.5);
    expect(parseNumberInput('')).toBeNull();
    expect(parseNumberInput('abc')).toBeNaN();
  });
  it('reads European dot thousands where they are unambiguous', () => {
    expect(parseNumberInput('1.950,5')).toBe(1950.5);
    expect(parseNumberInput('12.345.678')).toBe(12345678);
    expect(parseNumberInput('1.950', { integer: true })).toBe(1950); // a whole-number field can't hold 1.95
    expect(parseNumberInput('1.950')).toBe(1.95); // ambiguous in a decimal field: never guessed silently
    expect(parseNumberInput('0.125', { integer: true })).toBe(0.125); // not a thousands group; the schema rejects it
    expect(parseNumberInput('1 950')).toBe(1950); // Swedish and Norwegian spacing
    expect(parseNumberInput('1\u00a0950')).toBe(1950); // a no-break space pasted from a spreadsheet
  });
  it('says how it read the input when that is not obvious', () => {
    expect(readingEcho('720')).toBeNull();
    expect(readingEcho('1,950')).toBeNull(); // already in the display format
    expect(readingEcho('1 950')).toBe('Read as 1,950.');
    expect(readingEcho('1,5')).toBe('Read as 1.5.');
    expect(readingEcho('1.950', { integer: true })).toBe('Read as 1,950.');
    expect(readingEcho('1.950')).toBe('Read as 1.95. If you meant 1,950, type 1950.');
    expect(readingEcho('abc')).toBeNull(); // the schema's error covers it
  });
});

describe('format', () => {
  it('durations', () => {
    expect(fmtDuration(130_000)).toBe('2 min 10 s');
    expect(fmtDuration(45_000)).toBe('45 s');
  });
  it('median', () => {
    expect(median([1, 2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 7, 8])).toBe(4.5);
    expect(median([])).toBeNull();
  });
});

describe('period', () => {
  it('orders quarters and years', () => {
    expect(prevQuarter('2026-Q1')).toBe('2025-Q4');
    expect(quarterRange('2025-Q4', '2026-Q2')).toEqual(['2025-Q4', '2026-Q1', '2026-Q2']);
    expect(comparePeriods('2025-Q4', '2026-Q1')).toBeLessThan(0);
    expect(comparePeriods('2025', '2025-Q4')).toBeGreaterThan(0);
  });
});

describe('zod schemas', () => {
  const count = kpi({ id: 'n', companyId: 'h', valueType: 'integer', unit: 'heat pumps' });
  it('values: no negatives, whole numbers for counts, yes/no for booleans', () => {
    expect(valueSchema(count).safeParse(12).success).toBe(true);
    expect(valueSchema(count).safeParse(1.5).success).toBe(false);
    expect(valueSchema(count).safeParse(-1).success).toBe(false);
    expect(valueSchema({ ...count, valueType: 'boolean' }).safeParse(true).success).toBe(true);
    expect(valueSchema({ ...count, valueType: 'boolean' }).safeParse('yes').success).toBe(false);
  });
  it('requests: a category, one or two sentences, an urgency', () => {
    expect(requestSchema.safeParse({ category: 'hiring', text: 'Hiring our first US sales lead', urgency: 'This quarter' }).success).toBe(true);
    expect(requestSchema.safeParse({ category: 'hiring', text: 'Help', urgency: 'This quarter' }).success).toBe(false);
    expect(requestSchema.safeParse({ category: 'other', text: 'Hiring our first US sales lead', urgency: 'Soon' }).success).toBe(false);
  });
});

describe('exportCsv', () => {
  it('writes the reporting columns and escapes text', () => {
    const c = company({ id: 'h', name: 'Hearth, Inc' });
    const pai: Metric = { id: 'p', kind: 'adverse_impact', label: 'Board members', definition: 'Counted "at year end"', unit: '#', valueType: 'integer', cadence: 'annual', direction: 'increase', paiIndicator: 'Table 1, #13' };
    const k = kpi({ id: 'k', companyId: 'h', label: 'Units sold', weight: 0.6, annualTargets: { 2026: 400 } });
    const csv = exportCsv({
      companies: [c],
      metrics: [pai, k],
      values: [
        val('p', 'h', '2025', 3, { isEstimate: true, evidenceNote: 'Board minutes' }),
        val('p', 'h', '2026', 4, { status: 'draft' }),
        val('k', 'h', '2026-Q3', 250, { status: 'submitted', submittedAt: '2026-10-03T08:00:00Z' }),
      ],
    });
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe(EXPORT_COLUMNS.join(','));
    // An adverse-impact field: no KPI weight or target, but fund and capital travel with every row.
    expect(lines[1]).toBe('"Hearth, Inc",Fund II,1000000,Board members,adverse_impact,,"Counted ""at year end""",3,#,2025,increase,,,,yes,Board minutes,accepted,,,"Table 1, #13"');
    // A quarterly KPI carries its weight and targets, so actual ÷ target can be recomputed.
    expect(lines[2]).toBe('"Hearth, Inc",Fund II,1000000,Units sold,attributable_impact,0.6,Counted since launch.,250,#,2026-Q3,increase,400,,,no,,submitted,2026-10-03T08:00:00Z,,');
    expect(lines).toHaveLength(3); // drafts are not exported
  });
});
