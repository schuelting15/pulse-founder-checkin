// Adverse-impact fields, built from the RTS transcription (research/pai_table1.json).
// The indicator name and fund-level metric are the RTS wording, verbatim. The founder input label
// and unit are our derivation, recorded in the same file. Asked once a year, in the Q4 check-in.
import pai from '../../research/pai_table1.json';
import type { Metric } from '../lib/types';

type Input = { id: string; label: string; unit: string; type: string };
type Row = { ref: string; indicator: string; metric: string | string[]; companyInputs: Input[] };

const rows: Row[] = [...(pai.indicators as Row[]), ...(pai.optionalIndicators as Row[])];

export const PAI_SOURCE = pai.source;
export const PAI_REFERENCE_PERIOD = pai.referencePeriod.period;

export const paiMetrics: Metric[] = rows.flatMap((row) =>
  row.companyInputs.map((input): Metric => ({
    id: `pai_${input.id}`,
    kind: 'adverse_impact',
    label: input.label,
    definition: `Reported for the calendar year. Feeds PAI ${row.ref}, "${row.indicator}".`,
    unit: input.unit,
    valueType: input.type === 'boolean' ? 'boolean' : input.type === 'integer' ? 'integer' : 'number',
    allowNegative: input.id === 'gender_pay_gap',
    cadence: 'annual',
    paiIndicator: row.ref,
    paiIndicatorName: row.indicator,
    paiMetric: Array.isArray(row.metric) ? row.metric.join('; ') : row.metric,
    direction: 'decrease',
  })),
);
