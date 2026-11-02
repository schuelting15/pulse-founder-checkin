// Small hand-built fixtures for unit tests. Independent of the seed, so expected numbers can be
// worked out by hand in the test comments.
import type { Company, Helper, HelpRequest, Metric, Value } from './types';

export const company = (o: Partial<Company> & Pick<Company, 'id'>): Company => ({
  name: o.id,
  oneLiner: 'Does a thing.',
  sector: 'Energy tech',
  stage: 'Seed',
  country: 'SE',
  markets: [],
  sdgs: [7],
  impactThesis: 'More sales, more impact.',
  founder: { name: `Founder ${o.id}`, email: `${o.id}@example.com` },
  fund: 'Fund II',
  investedCapitalEUR: 1_000_000,
  ...o,
});

export const kpi = (o: Partial<Metric> & Pick<Metric, 'id' | 'companyId'>): Metric => ({
  kind: 'impact_kpi',
  kpiType: 'attributable_impact',
  label: o.id,
  definition: 'Counted since launch.',
  unit: '#',
  valueType: 'number',
  cadence: 'quarterly',
  cumulative: true,
  direction: 'increase',
  weight: 1,
  ...o,
});

export const val = (metricId: string, companyId: string, period: string, value: number | boolean | null, o: Partial<Value> = {}): Value => ({
  metricId,
  companyId,
  period,
  value,
  isEstimate: false,
  status: 'accepted',
  ...o,
});

export const helper = (o: Partial<Helper> & Pick<Helper, 'id' | 'name'>): Helper => ({
  kind: 'venture_partner',
  title: 'Venture Partner',
  expertise: [],
  tags: [],
  sectors: [],
  geos: [],
  capacityPerQuarter: 3,
  ...o,
});

export const req = (o: Partial<HelpRequest> & Pick<HelpRequest, 'id' | 'companyId'>): HelpRequest => ({
  createdAt: '2026-10-05T09:00:00Z',
  quarter: '2026-Q3',
  category: 'hiring',
  text: 'Help with something.',
  tags: [],
  urgency: 'This quarter',
  status: 'new',
  ...o,
});
