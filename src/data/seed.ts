// INVENTED demo data. No real company, person or figure. KPI types and units are shaped like
// those in published impact reports of VC funds; values and companies are made up.
// Names were checked against web search on 25 Oct 2026.
//
// Story for the 2026-Q3 check-in: 7 on track, 3 at risk, 1 off track, 1 not yet checked in (the
// demo company, Hearthline). 2 values are estimates, 1 value is queried by the impact team.
import { CURRENT_QUARTER } from '../lib/config';
import { periodFor } from '../lib/cadence';
import type { AuditEntry, CheckIn, Company, DemoState, Helper, HelpRequest, Metric, Value } from '../lib/types';
import { paiMetrics } from './pai';

const M = 1_000_000;

export const DEMO_COMPANY_ID = 'hearthline';

export const companies: Company[] = [
  { id: 'hearthline', name: 'Hearthline', oneLiner: 'Heat pump retrofits for apartment blocks, paid for per flat.', sector: 'Energy tech', stage: 'Seed', country: 'SE', markets: ['NO'], sdgs: [7, 13], impactThesis: 'Every heat pump installed replaces a gas boiler, so each sale avoids heating emissions for the life of the unit.', founder: { name: 'Maja Lindqvist', email: 'maja.lindqvist@example.com' }, fund: 'Fund II', investedCapitalEUR: 2.0 * M },
  { id: 'tessel', name: 'Tessel Grid', oneLiner: 'Software that shifts commercial electricity demand away from peak hours.', sector: 'Energy tech', stage: 'Series A', country: 'NL', markets: ['DE', 'BE', 'US'], sdgs: [7, 9, 13], impactThesis: 'Each megawatt-hour shifted off-peak displaces gas peaker generation, and revenue is a share of the savings.', founder: { name: 'Joost van Dalen', email: 'joost.vandalen@example.com' }, fund: 'Fund II', investedCapitalEUR: 6.0 * M },
  { id: 'ferrocycle', name: 'Ferrocycle', oneLiner: 'Sensor-based sorting that turns mixed scrap into feedstock for low-carbon steel.', sector: 'Next gen industry', stage: 'Series A', country: 'DE', markets: ['AT', 'PL'], sdgs: [9, 12], impactThesis: 'Every tonne of scrap upgraded to clean feedstock replaces virgin iron in electric arc furnaces.', founder: { name: 'Katrin Weber', email: 'katrin.weber@example.com' }, fund: 'Fund II', investedCapitalEUR: 5.0 * M },
  { id: 'ombyt', name: 'Ombyt Foods', oneLiner: 'Fermentation that turns bakery and brewery side streams into protein.', sector: 'Sustainable food', stage: 'Seed', country: 'DK', markets: ['SE'], sdgs: [2, 12], impactThesis: 'Each tonne of protein sold is made from side streams that would otherwise be wasted.', founder: { name: 'Freja Nielsen', email: 'freja.nielsen@example.com' }, fund: 'Fund II', investedCapitalEUR: 1.5 * M },
  { id: 'vardaro', name: 'Vardaro Health', oneLiner: 'Remote monitoring for heart-failure patients after discharge.', sector: 'Healthtech', stage: 'Series B', country: 'ES', markets: ['PT', 'IT'], sdgs: [3], impactThesis: 'Each patient monitored at home is a licence sold and a lower chance of readmission.', founder: { name: 'Lucía Ortega', email: 'lucia.ortega@example.com' }, fund: 'Fund I', investedCapitalEUR: 8.0 * M },
  { id: 'oakpath', name: 'Oakpath Learning', oneLiner: 'Maths tutoring that adapts to each pupil, sold to state schools.', sector: 'Education', stage: 'Series A', country: 'GB', markets: ['IE'], sdgs: [4], impactThesis: 'Each school licence puts adaptive tutoring in front of pupils who could not afford a private tutor.', founder: { name: 'Amara Hughes', email: 'amara.hughes@example.com' }, fund: 'Fund II', investedCapitalEUR: 4.0 * M },
  { id: 'tangfarm', name: 'Tangfarm', oneLiner: 'Offshore seaweed farms supplying food and feed ingredients.', sector: 'Ocean & food', stage: 'Seed', country: 'NO', markets: ['DK'], sdgs: [14, 2], impactThesis: 'Every tonne harvested is food grown without land, fresh water or fertiliser.', founder: { name: 'Eirik Solberg', email: 'eirik.solberg@example.com' }, fund: 'Fund II', investedCapitalEUR: 1.2 * M },
  { id: 'segunda', name: 'Segunda Água', oneLiner: 'Containerised plants that clean industrial wastewater for reuse on site.', sector: 'Water', stage: 'Seed', country: 'PT', markets: ['ES'], sdgs: [6], impactThesis: 'Each megalitre recycled is fresh water a factory no longer draws from a stressed basin.', founder: { name: 'Inês Carvalho', email: 'ines.carvalho@example.com' }, fund: 'Fund II', investedCapitalEUR: 1.8 * M },
  { id: 'kuusi', name: 'Kuusi Analytics', oneLiner: 'Satellite and AI monitoring of forest health for owners and buyers of carbon credits.', sector: 'Climate data & AI', stage: 'Series A', country: 'FI', markets: ['SE', 'DE'], sdgs: [13, 15], impactThesis: 'Every hectare under monitoring is forest whose loss would be caught and acted on within weeks.', founder: { name: 'Aino Lehtonen', email: 'aino.lehtonen@example.com' }, fund: 'Fund II', investedCapitalEUR: 4.5 * M },
  { id: 'kordus', name: 'Kordus', oneLiner: 'Rental instead of purchase for baby gear and household equipment.', sector: 'Circular economy', stage: 'Seed', country: 'EE', markets: ['FI', 'LV'], sdgs: [12], impactThesis: 'Each rental replaces a new product that would otherwise be bought and used for a few months.', founder: { name: 'Kristjan Tamm', email: 'kristjan.tamm@example.com' }, fund: 'Fund II', investedCapitalEUR: 1.0 * M },
  { id: 'secondcell', name: 'Secondcell', oneLiner: 'Second-life storage built from retired electric vehicle batteries.', sector: 'Energy tech', stage: 'Series B', country: 'FR', markets: ['DE', 'ES'], sdgs: [7, 12], impactThesis: 'Each pack reused delays recycling by years and adds storage that balances a renewable grid.', founder: { name: 'Camille Moreau', email: 'camille.moreau@example.com' }, fund: 'Fund I', investedCapitalEUR: 9.0 * M },
  { id: 'fairpath', name: 'Fairpath Credit', oneLiner: 'Fair-priced credit for people with thin credit files.', sector: 'Fintech', stage: 'Series A', country: 'IE', markets: ['GB'], sdgs: [1, 10], impactThesis: 'Each loan replaces a payday loan at several times the cost.', founder: { name: 'Ciarán Byrne', email: 'ciaran.byrne@example.com' }, fund: 'Fund II', investedCapitalEUR: 3.5 * M },
];

/** Shorthand for a cumulative quarterly impact KPI. */
const kpi = (companyId: string, id: string, o: Omit<Metric, 'id' | 'companyId' | 'kind' | 'cadence' | 'direction'> & Partial<Pick<Metric, 'direction'>>): Metric => ({
  id: `${companyId}_${id}`,
  companyId,
  kind: 'impact_kpi',
  cadence: 'quarterly',
  direction: 'increase',
  cumulative: true,
  ...o,
});

export const kpis: Metric[] = [
  kpi('hearthline', 'installs', { kpiType: 'business', label: 'Heat pumps installed', definition: 'Heat pumps commissioned in customer buildings since launch, counted from commissioning certificates.', unit: 'heat pumps', valueType: 'integer', sdg: 7, weight: 1, annualTargets: { 2025: 300, 2026: 900, 2027: 1800 }, longTermTarget: 6000, longTermTargetYear: 2029 }),
  kpi('hearthline', 'co2', { kpiType: 'attributable_impact', label: 'Tonnes CO2e avoided', definition: 'CO2e avoided since launch by installed heat pumps compared with the gas boilers they replaced. Modelled from installs until metered data is available.', unit: 't CO2e', valueType: 'number', sdg: 13, weight: 0, annualTargets: { 2025: 800, 2026: 2400, 2027: 5200 }, longTermTarget: 18000, longTermTargetYear: 2029 }),
  kpi('hearthline', 'partners', { kpiType: 'operational', label: 'Certified installer partners', definition: 'Installer firms that completed certification and installed at least once.', unit: 'partners', valueType: 'integer', cumulative: false, weight: 0, annualTargets: { 2026: 22, 2027: 40 } }),
  kpi('tessel', 'shifted', { kpiType: 'attributable_impact', label: 'GWh shifted off-peak', definition: 'Electricity demand moved out of peak hours by the platform since launch, from meter data.', unit: 'GWh', valueType: 'number', sdg: 7, weight: 1, annualTargets: { 2025: 40, 2026: 120, 2027: 260 }, longTermTarget: 900, longTermTargetYear: 2030 }),
  kpi('ferrocycle', 'scrap', { kpiType: 'attributable_impact', label: 'Tonnes of scrap upgraded', definition: 'Mixed scrap sorted to electric-arc-furnace grade since launch, from weighbridge records.', unit: 't', valueType: 'number', sdg: 12, weight: 1, annualTargets: { 2025: 3000, 2026: 9000, 2027: 20000 }, longTermTarget: 80000, longTermTargetYear: 2030 }),
  kpi('ombyt', 'protein', { kpiType: 'attributable_impact', label: 'Tonnes of side streams turned into protein', definition: 'Bakery and brewery side streams fermented into protein since launch, by input weight.', unit: 't', valueType: 'number', sdg: 12, weight: 1, annualTargets: { 2025: 120, 2026: 400, 2027: 1100 }, longTermTarget: 5000, longTermTargetYear: 2030 }),
  kpi('vardaro', 'patients', { kpiType: 'attributable_impact', label: 'Patients monitored at home', definition: 'Patients enrolled in remote monitoring since launch.', unit: 'patients', valueType: 'integer', sdg: 3, weight: 1, annualTargets: { 2025: 20000, 2026: 40000, 2027: 65000 }, longTermTarget: 120000, longTermTargetYear: 2028 }),
  kpi('vardaro', 'sites', { kpiType: 'operational', label: 'Hospital sites live', definition: 'Hospital sites using the platform at quarter end.', unit: 'sites', valueType: 'integer', cumulative: false, weight: 0, annualTargets: { 2026: 30, 2027: 45 } }),
  kpi('oakpath', 'pupils', { kpiType: 'attributable_impact', label: 'Pupils active on the platform', definition: 'Pupils with at least three tutoring sessions since launch.', unit: 'pupils', valueType: 'integer', sdg: 4, weight: 1, annualTargets: { 2025: 50000, 2026: 140000, 2027: 260000 }, longTermTarget: 600000, longTermTargetYear: 2030 }),
  kpi('tangfarm', 'harvest', { kpiType: 'attributable_impact', label: 'Tonnes of seaweed harvested', definition: 'Wet weight harvested since launch, from landing notes.', unit: 't', valueType: 'number', sdg: 14, weight: 1, annualTargets: { 2025: 60, 2026: 200, 2027: 600 }, longTermTarget: 3000, longTermTargetYear: 2030 }),
  kpi('segunda', 'recycled', { kpiType: 'attributable_impact', label: 'Megalitres of wastewater recycled', definition: 'Wastewater treated and reused on customer sites since launch, from flow meters.', unit: 'ML', valueType: 'number', sdg: 6, weight: 1, annualTargets: { 2025: 150, 2026: 500, 2027: 1400 }, longTermTarget: 6000, longTermTargetYear: 2030 }),
  kpi('kuusi', 'hectares', { kpiType: 'attributable_impact', label: 'Hectares of forest under monitoring', definition: 'Forest area under active monitoring at quarter end, cumulative since launch.', unit: 'ha', valueType: 'number', sdg: 15, weight: 1, annualTargets: { 2025: 400000, 2026: 1200000, 2027: 2500000 }, longTermTarget: 8000000, longTermTargetYear: 2030 }),
  kpi('kordus', 'rentals', { kpiType: 'attributable_impact', label: 'Items rented instead of bought', definition: 'Rental orders fulfilled since launch.', unit: 'items', valueType: 'integer', sdg: 12, weight: 1, annualTargets: { 2025: 15000, 2026: 50000, 2027: 120000 }, longTermTarget: 400000, longTermTargetYear: 2030 }),
  kpi('secondcell', 'cells', { kpiType: 'attributable_impact', label: 'Tonnes of battery cells given a second life', definition: 'Cell weight repurposed into storage instead of recycled, since launch.', unit: 't', valueType: 'number', sdg: 12, weight: 0.5, annualTargets: { 2025: 900, 2026: 2000, 2027: 3600 }, longTermTarget: 8000, longTermTargetYear: 2028 }),
  kpi('secondcell', 'storage', { kpiType: 'attributable_impact', label: 'MWh of storage balancing the grid', definition: 'Second-life storage capacity commissioned for grid services since launch.', unit: 'MWh', valueType: 'number', sdg: 7, weight: 0.5, annualTargets: { 2025: 300, 2026: 700, 2027: 1300 }, longTermTarget: 3000, longTermTargetYear: 2028 }),
  kpi('fairpath', 'borrowers', { kpiType: 'attributable_impact', label: 'People given fair-priced credit', definition: 'Borrowers with at least one loan since launch.', unit: 'people', valueType: 'integer', sdg: 1, weight: 1, annualTargets: { 2025: 10000, 2026: 30000, 2027: 60000 }, longTermTarget: 150000, longTermTargetYear: 2030 }),
  kpi('fairpath', 'defaults', { kpiType: 'operational', label: 'Default rate on loans issued', definition: 'Share of loans issued since launch that defaulted.', unit: '%', valueType: 'number', cumulative: false, direction: 'decrease', weight: 0, annualTargets: { 2026: 4.5, 2027: 4.0 } }),
];

type Q3 = { v: number; status: Value['status']; estimate?: boolean; note?: string; comment?: string; reviewNote?: string };
/** [2025-Q4, 2026-Q1, 2026-Q2] accepted, plus the 2026-Q3 submission if there is one. */
const series: Record<string, { hist: [number, number, number]; q3?: Q3; histNotes?: Partial<Record<1 | 2, string>> }> = {
  hearthline_installs: { hist: [260, 450, 640] },
  hearthline_co2: { hist: [700, 900, 1150] },
  hearthline_partners: { hist: [12, 16, 20] },
  tessel_shifted: { hist: [46, 60, 80], q3: { v: 87, status: 'submitted', comment: 'Two large customers paused flexibility during summer maintenance.' } },
  ferrocycle_scrap: { hist: [3400, 4800, 6300], q3: { v: 7900, status: 'accepted' } },
  ombyt_protein: { hist: [95, 160, 250], q3: { v: 330, status: 'submitted', estimate: true, note: 'September input weights estimated from purchase orders; weighbridge data arrives in November.' } },
  vardaro_patients: { hist: [24500, 28000, 32500], q3: { v: 36400, status: 'accepted' } },
  vardaro_sites: { hist: [18, 21, 24], q3: { v: 26, status: 'accepted' } },
  oakpath_pupils: { hist: [61000, 80000, 101000], q3: { v: 125000, status: 'accepted' } },
  tangfarm_harvest: { hist: [48, 52, 90], histNotes: { 2: 'Spring harvest from both sites.' }, q3: { v: 136, status: 'submitted', note: 'Second farm site started harvesting in August; landing notes attached.' } },
  segunda_recycled: { hist: [110, 140, 175], q3: { v: 245, status: 'submitted', comment: 'Third site delayed by permitting; now expected in Q1 2027.' } },
  kuusi_hectares: { hist: [520000, 700000, 860000], q3: { v: 1010000, status: 'submitted', estimate: true, note: 'One customer contract signed in late September; area from the signed contract, not yet onboarded.' } },
  kordus_rentals: { hist: [18200, 25000, 33000], q3: { v: 42500, status: 'submitted' } },
  secondcell_cells: { hist: [1050, 1300, 1550], q3: { v: 1780, status: 'accepted' } },
  secondcell_storage: { hist: [280, 360, 450], q3: { v: 560, status: 'accepted' } },
  fairpath_borrowers: { hist: [8900, 12500, 17000], q3: { v: 21000, status: 'accepted' } },
  fairpath_defaults: { hist: [6.0, 5.8, 5.4], q3: { v: 5.0, status: 'queried', reviewNote: 'Is 5.0% for all loans since launch, or for loans issued this quarter? The definition says since launch.' } },
};

const HIST_PERIODS = ['2025-Q4', '2026-Q1', '2026-Q2'] as const;
const HIST_DATES: Record<string, [string, string]> = {
  '2025-Q4': ['2026-01-12T10:00:00Z', '2026-01-22T14:00:00Z'],
  '2026-Q1': ['2026-04-10T10:00:00Z', '2026-04-20T14:00:00Z'],
  '2026-Q2': ['2026-07-10T10:00:00Z', '2026-07-20T14:00:00Z'],
};
/** Q3 submissions arrive through October; a few were already reviewed. */
const Q3_SUBMITTED: Record<string, string> = {
  tessel: '2026-10-14T09:12:00Z', ferrocycle: '2026-10-03T08:40:00Z', ombyt: '2026-10-16T13:05:00Z', vardaro: '2026-10-06T15:30:00Z',
  oakpath: '2026-10-07T11:20:00Z', tangfarm: '2026-10-17T07:55:00Z', segunda: '2026-10-15T16:10:00Z', kuusi: '2026-10-19T10:45:00Z',
  kordus: '2026-10-20T12:00:00Z', secondcell: '2026-10-02T09:00:00Z', fairpath: '2026-10-09T14:25:00Z',
};
const Q3_REVIEWED = '2026-10-13T10:00:00Z';

function buildValuesAndAudit(): { values: Value[]; audit: AuditEntry[]; checkIns: CheckIn[] } {
  const values: Value[] = [];
  const audit: AuditEntry[] = [];
  for (const m of kpis) {
    const s = series[m.id];
    const companyId = m.companyId!;
    s.hist.forEach((v, i) => {
      const period = HIST_PERIODS[i];
      const [submittedAt, reviewedAt] = HIST_DATES[period];
      const note = s.histNotes?.[i as 1 | 2];
      values.push({ metricId: m.id, companyId, period, value: v, isEstimate: false, evidenceNote: note, status: 'accepted', submittedAt, reviewedAt });
      audit.push({ at: submittedAt, actor: 'founder', companyId, metricId: m.id, action: 'Value submitted', to: v, note });
      audit.push({ at: reviewedAt, actor: 'impact_team', companyId, metricId: m.id, action: 'Value accepted' });
    });
    if (s.q3) {
      const submittedAt = Q3_SUBMITTED[companyId];
      const v: Value = {
        metricId: m.id, companyId, period: CURRENT_QUARTER, value: s.q3.v, isEstimate: !!s.q3.estimate, evidenceNote: s.q3.note, comment: s.q3.comment,
        status: s.q3.status, submittedAt, reviewedAt: s.q3.status === 'submitted' ? undefined : Q3_REVIEWED, reviewNote: s.q3.reviewNote,
      };
      values.push(v);
      audit.push({ at: submittedAt, actor: 'founder', companyId, metricId: m.id, action: 'Value submitted', from: s.hist[2], to: s.q3.v, note: s.q3.note ?? s.q3.comment });
      if (s.q3.status === 'accepted') audit.push({ at: Q3_REVIEWED, actor: 'impact_team', companyId, metricId: m.id, action: 'Value accepted' });
      if (s.q3.status === 'queried') audit.push({ at: Q3_REVIEWED, actor: 'impact_team', companyId, metricId: m.id, action: 'Value queried', note: s.q3.reviewNote });
    }
  }
  const checkIns: CheckIn[] = Object.entries(Q3_SUBMITTED).map(([companyId, submittedAt]) => {
    const n = kpis.filter((m) => m.companyId === companyId).length;
    const started = new Date(Date.parse(submittedAt) - (150 + n * 40) * 1000).toISOString();
    return { id: `ci_${companyId}_${CURRENT_QUARTER}`, companyId, quarter: CURRENT_QUARTER, startedAt: started, submittedAt, fieldsShown: n, fieldsPrefilled: n, fieldsChanged: n };
  });
  return { values, audit, checkIns };
}

// PAI inputs for calendar year 2025, collected in the Q4 2025 check-in (filed January 2026).
// Columns: scope1, scope2, scope3 (tCO2e), renewable/non-renewable consumption, renewable/
// non-renewable production (MWh), water (t), hazardous waste (t), pay gap (%), board F/M/X,
// UNGC processes, carbon reduction initiative, supplier code of conduct.
type PaiRow = [number, number, number, number, number, number, number, number, number, number, number, number, number, boolean, boolean, boolean];
const PAI_2025: Record<string, PaiRow> = {
  hearthline: [4, 6, 410, 38, 6, 0, 0, 0, 0.1, 6.5, 1, 2, 0, true, true, false],
  tessel: [0, 9, 180, 120, 14, 0, 0, 0, 0, 11.2, 2, 3, 0, true, true, true],
  ferrocycle: [38, 140, 1420, 620, 180, 0, 0, 0, 2.6, 14.8, 1, 4, 0, true, true, true],
  ombyt: [12, 22, 260, 90, 30, 0, 0, 0.4, 0, 3.1, 2, 1, 0, false, true, false],
  vardaro: [3, 18, 640, 140, 25, 0, 0, 0, 0.2, 9.4, 2, 3, 0, true, true, true],
  oakpath: [0, 7, 210, 60, 4, 0, 0, 0, 0, -2.4, 3, 2, 0, true, true, true],
  tangfarm: [26, 2, 95, 10, 34, 0, 0, 0, 0, 0, 1, 2, 0, false, false, false],
  segunda: [9, 31, 150, 70, 40, 0, 0, 1.2, 0.6, 7.7, 1, 3, 0, true, true, true],
  kuusi: [0, 4, 120, 140, 3, 0, 0, 0, 0, 12.9, 1, 4, 0, true, true, true],
  kordus: [2, 3, 80, 25, 6, 0, 0, 0, 0, 5.5, 1, 2, 1, false, true, true],
  secondcell: [14, 65, 980, 410, 70, 120, 0, 0, 3.4, 8.2, 2, 5, 0, true, true, true],
  fairpath: [0, 5, 140, 45, 3, 0, 0, 0, 0, 16.1, 1, 4, 0, true, false, false],
};
const PAI_ORDER = [
  'ghg_scope1', 'ghg_scope2', 'ghg_scope3', 'energy_cons_renewable', 'energy_cons_nonrenewable', 'energy_prod_renewable', 'energy_prod_nonrenewable',
  'emissions_to_water', 'hazardous_radioactive_waste', 'gender_pay_gap', 'board_female', 'board_male', 'board_nonbinary',
  'ungc_oecd_processes', 'carbon_reduction_initiative', 'supplier_code_of_conduct',
] as const;
/** Inputs answered "no" for every company in 2025. */
const PAI_ALL_NO = ['fossil_fuel_activity', 'biodiversity_sensitive_sites', 'ungc_oecd_violation', 'controversial_weapons'];

function buildPaiValues(): Value[] {
  const out: Value[] = [];
  for (const [companyId, row] of Object.entries(PAI_2025)) {
    const base = { companyId, period: '2025', isEstimate: false, status: 'accepted' as const, submittedAt: '2026-01-14T10:00:00Z', reviewedAt: '2026-01-28T10:00:00Z' };
    PAI_ORDER.forEach((input, i) => out.push({ ...base, metricId: `pai_${input}`, value: row[i], isEstimate: input === 'ghg_scope3' }));
    PAI_ALL_NO.forEach((input) => out.push({ ...base, metricId: `pai_${input}`, value: false }));
  }
  return out;
}

export const helpers: Helper[] = [
  { id: 'vp_holm', kind: 'venture_partner', name: 'Ingrid Holm', title: 'Venture Partner, former Chief Revenue Officer at a climate hardware scale-up', expertise: ['hiring', 'customers'], tags: ['us-expansion', 'sales-hiring', 'procurement'], sectors: ['Energy tech', 'Next gen industry'], geos: ['US', 'SE', 'DE'], capacityPerQuarter: 3 },
  { id: 'vp_ferreira', kind: 'venture_partner', name: 'Tomás Ferreira', title: 'Venture Partner, former CTO of an industrial AI company', expertise: ['responsible_ai', 'hiring'], tags: ['ai-governance', 'engineering-hiring'], sectors: ['Climate data & AI', 'Healthtech'], geos: ['PT', 'ES', 'GB', 'FI'], capacityPerQuarter: 3 },
  { id: 'vp_laurent', kind: 'venture_partner', name: 'Sophie Laurent', title: 'Venture Partner, former CFO of a battery company', expertise: ['fundraising', 'grants'], tags: ['series-a', 'series-b', 'eic', 'debt'], sectors: ['Energy tech', 'Next gen industry'], geos: ['FR', 'DE', 'NL'], capacityPerQuarter: 2 },
  { id: 'vp_virtanen', kind: 'venture_partner', name: 'Mikael Virtanen', title: 'Venture Partner, operator in grids and utilities', expertise: ['customers', 'regulation_market_entry'], tags: ['utilities', 'procurement', 'permitting'], sectors: ['Energy tech', 'Water'], geos: ['FI', 'SE', 'NO', 'DE'], capacityPerQuarter: 3 },
  { id: 'vp_okafor', kind: 'venture_partner', name: 'Hannah Okafor', title: 'Venture Partner, former Head of People at an edtech scale-up', expertise: ['hiring', 'policies_governance'], tags: ['sales-hiring', 'engineering-hiring', 'operations-hiring', 'board'], sectors: ['Education', 'Fintech'], geos: ['GB', 'IE', 'US'], capacityPerQuarter: 3 },
  { id: 'vp_dahl', kind: 'venture_partner', name: 'Lars Dahl', title: 'Venture Partner, founder of a food company (exited)', expertise: ['customers', 'fundraising'], tags: ['procurement', 'series-a'], sectors: ['Sustainable food', 'Ocean & food'], geos: ['NO', 'DK', 'SE'], capacityPerQuarter: 2 },
  { id: 'vp_rossi', kind: 'venture_partner', name: 'Elena Rossi', title: 'Venture Partner, medtech regulatory lead', expertise: ['regulation_market_entry', 'responsible_ai'], tags: ['permitting', 'ai-governance'], sectors: ['Healthtech', 'Water'], geos: ['IT', 'ES', 'PT', 'FR'], capacityPerQuarter: 2 },
  { id: 'vp_devries', kind: 'venture_partner', name: 'Pieter de Vries', title: 'Venture Partner, circular economy and retail operator', expertise: ['customers', 'esg_reporting'], tags: ['scope-3', 'taxonomy', 'procurement'], sectors: ['Circular economy', 'Next gen industry'], geos: ['NL', 'BE', 'DE'], capacityPerQuarter: 3 },
  { id: 'co_selvik', kind: 'corporate', name: 'Selvik Energy', title: 'Head of innovation partnerships', org: 'Selvik Energy (utility)', expertise: ['customers'], tags: ['utilities', 'procurement'], sectors: ['Energy tech'], geos: ['NO', 'SE', 'FI'], capacityPerQuarter: 2 },
  { id: 'co_brennholm', kind: 'corporate', name: 'Brennholm Industries', title: 'Director of procurement', org: 'Brennholm Industries (industrial group)', expertise: ['customers'], tags: ['procurement'], sectors: ['Next gen industry', 'Circular economy'], geos: ['DE', 'PL'], capacityPerQuarter: 2 },
  { id: 'co_aurelia', kind: 'corporate', name: 'Aurelia Hospital Group', title: 'Head of digital health', org: 'Aurelia Hospital Group (hospitals)', expertise: ['customers', 'responsible_ai'], tags: ['procurement', 'ai-governance'], sectors: ['Healthtech'], geos: ['ES', 'PT'], capacityPerQuarter: 2 },
  { id: 'co_northbank', kind: 'corporate', name: 'Northbank Mutual', title: 'Head of partnerships', org: 'Northbank Mutual (bank and insurer)', expertise: ['customers', 'fundraising'], tags: ['debt', 'procurement'], sectors: ['Fintech'], geos: ['IE', 'GB'], capacityPerQuarter: 2 },
  { id: 'team_platform', kind: 'team', name: 'Platform team', title: 'Events, communities and introductions', expertise: ['grants', 'fundraising', 'other'], tags: ['eic'], sectors: [], geos: [], capacityPerQuarter: 10 },
  { id: 'team_impact', kind: 'team', name: 'Impact team', title: 'Impact measurement and ESG support', expertise: ['esg_reporting', 'policies_governance', 'responsible_ai'], tags: ['scope-3', 'taxonomy', 'ai-governance'], sectors: [], geos: [], capacityPerQuarter: 10 },
];

/** [id, company, quarter, category, text, urgency, helper, created, days to intro, days to resolve, rating] */
type R = [string, string, string, HelpRequest['category'], string, HelpRequest['urgency'], string, string, number, number, 1 | 2 | 3 | 4 | 5];
const RESOLVED: R[] = [
  ['r01', 'tessel', '2026-Q2', 'hiring', 'We need our first US account executive and have never hired in the US.', 'This quarter', 'vp_holm', '2026-07-08', 4, 30, 5],
  ['r02', 'vardaro', '2026-Q1', 'responsible_ai', 'Hospital buyers want an AI risk assessment before procurement, and we have none.', 'This month', 'vp_rossi', '2026-04-07', 5, 21, 5],
  ['r03', 'ferrocycle', '2026-Q1', 'customers', 'An introduction to the scrap procurement lead at a large steel group.', 'This quarter', 'co_brennholm', '2026-04-09', 6, 40, 4],
  ['r04', 'oakpath', '2026-Q2', 'fundraising', 'Series B in 2027: who should we get to know this year?', 'Whenever', 'vp_laurent', '2026-07-09', 3, 35, 4],
  ['r05', 'secondcell', '2026-Q1', 'grants', 'EU Innovation Fund application: has anyone in the portfolio applied?', 'This month', 'team_platform', '2026-04-06', 2, 14, 5],
  ['r06', 'ombyt', '2026-Q2', 'customers', 'A first pilot with a Danish grocery chain for our protein ingredient.', 'This quarter', 'vp_dahl', '2026-07-13', 7, 42, 4],
  ['r07', 'kuusi', '2026-Q2', 'responsible_ai', 'Model documentation for an EU AI Act conformity review.', 'This quarter', 'vp_ferreira', '2026-07-10', 4, 28, 5],
  ['r08', 'kordus', '2026-Q1', 'esg_reporting', 'Scope 3 for a rental business: what do we count, and what can we leave out?', 'This quarter', 'team_impact', '2026-04-08', 1, 10, 5],
  ['r09', 'segunda', '2026-Q2', 'regulation_market_entry', 'Water reuse permits differ by region in Spain; who has been through this?', 'This quarter', 'vp_rossi', '2026-07-14', 8, 45, 3],
  ['r10', 'fairpath', '2026-Q1', 'policies_governance', 'Our first independent board member: how do others find and pay one?', 'Whenever', 'vp_okafor', '2026-04-10', 5, 33, 4],
  ['r11', 'tangfarm', '2026-Q1', 'grants', 'A Norwegian innovation grant for our second farm site.', 'This quarter', 'team_platform', '2026-04-13', 3, 20, 4],
  ['r12', 'hearthline', '2026-Q2', 'customers', 'An introduction to a housing association with gas-heated blocks.', 'This quarter', 'co_selvik', '2026-07-07', 5, 38, 4],
  ['r13', 'ferrocycle', '2026-Q2', 'hiring', 'A plant manager with steel experience for our first site.', 'This month', 'vp_okafor', '2026-07-09', 6, 50, 3],
  ['r14', 'kuusi', '2026-Q1', 'hiring', 'Our first data engineer outside Finland.', 'Whenever', 'vp_ferreira', '2026-04-14', 4, 36, 4],
];
/** [id, company, category, text, urgency, status, helper, created, days to intro] */
type O = [string, string, HelpRequest['category'], string, HelpRequest['urgency'], HelpRequest['status'], string | undefined, string, number | undefined];
const OPEN: O[] = [
  ['r15', 'ferrocycle', 'hiring', 'A head of operations for our second plant, ideally with permitting experience.', 'This quarter', 'intro_drafted', 'vp_holm', '2026-10-03', undefined],
  ['r16', 'oakpath', 'hiring', 'An engineering manager who has grown a team past 20 people.', 'This quarter', 'new', undefined, '2026-10-07', undefined],
  ['r17', 'tangfarm', 'hiring', 'Our first farm operations lead in northern Norway.', 'Whenever', 'new', undefined, '2026-10-17', undefined],
  ['r18', 'vardaro', 'responsible_ai', 'A second hospital group asks for our AI incident process before renewal.', 'This month', 'intro_sent', 'vp_rossi', '2026-10-06', 4],
  ['r19', 'fairpath', 'fundraising', 'A debt facility for the loan book: who in the network has raised one?', 'This quarter', 'new', undefined, '2026-10-09', undefined],
];

const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T09:00:00Z`) + days * 86_400_000).toISOString();

function buildRequests(): { requests: HelpRequest[]; audit: AuditEntry[] } {
  const requests: HelpRequest[] = [];
  const audit: AuditEntry[] = [];
  for (const [id, companyId, quarter, category, text, urgency, helperId, created, dIntro, dResolve, rating] of RESOLVED) {
    const createdAt = addDays(created, 0);
    const introSentAt = addDays(created, dIntro);
    const resolvedAt = addDays(created, dResolve);
    requests.push({ id, companyId, createdAt, quarter, category, text, tags: [], urgency, status: 'resolved', helperId, introSentAt, resolvedAt, rating });
    audit.push({ at: createdAt, actor: 'founder', companyId, requestId: id, action: 'Request created', note: text });
    audit.push({ at: introSentAt, actor: 'platform_team', companyId, requestId: id, action: 'Intro sent', to: helperId });
    audit.push({ at: resolvedAt, actor: 'platform_team', companyId, requestId: id, action: 'Request resolved', to: `${rating}/5` });
  }
  for (const [id, companyId, category, text, urgency, status, helperId, created, dIntro] of OPEN) {
    const createdAt = addDays(created, 0);
    const introSentAt = dIntro !== undefined ? addDays(created, dIntro) : undefined;
    requests.push({ id, companyId, createdAt, quarter: CURRENT_QUARTER, category, text, tags: [], urgency, status, helperId, introSentAt });
    audit.push({ at: createdAt, actor: 'founder', companyId, requestId: id, action: 'Request created', note: text });
    if (helperId) audit.push({ at: addDays(created, 1), actor: 'platform_team', companyId, requestId: id, action: 'Intro drafted', to: helperId });
    if (introSentAt) audit.push({ at: introSentAt, actor: 'platform_team', companyId, requestId: id, action: 'Intro sent', to: helperId });
  }
  return { requests, audit };
}

export function createSeed(): DemoState {
  const kv = buildValuesAndAudit();
  const rq = buildRequests();
  const audit = [...kv.audit, ...rq.audit].sort((a, b) => a.at.localeCompare(b.at));
  return {
    version: 2,
    companies,
    metrics: [...kpis, ...paiMetrics],
    values: [...kv.values, ...buildPaiValues()],
    helpers,
    requests: rq.requests,
    checkIns: kv.checkIns,
    audit,
  };
}

/** Exposed for tests: the period a metric would report for in the current check-in. */
export const currentPeriodFor = (m: Metric) => periodFor(m, CURRENT_QUARTER);
