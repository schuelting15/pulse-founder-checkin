// Data model.
import type { CategoryId, Stage, Urgency } from './config';

export type Cadence = 'one-time' | 'annual' | 'quarterly';
export type ValueStatus = 'draft' | 'submitted' | 'accepted' | 'queried';
export type Fund = 'Fund I' | 'Fund II';

export interface Company {
  id: string;
  name: string;
  oneLiner: string;
  sector: string;
  stage: Stage;
  country: string; // ISO 3166 alpha-2
  /** Markets the company sells into besides its home country (geo term of the match score). */
  markets: string[];
  sdgs: number[];
  /** How revenue drives impact, in one sentence. Set at entry; changed only via the audit log. */
  impactThesis: string;
  founder: { name: string; email: string }; // invented, example.com
  fund: Fund;
  /** Invented. Weights the portfolio aggregate by capital invested (EIF Gamma Model). */
  investedCapitalEUR: number;
}

/** WS p.5 template rows. Operational KPIs carry targets but no weight. */
export type KpiType = 'business' | 'attributable_impact' | 'operational';

/** Impact KPIs and adverse-impact fields share one shape. */
export interface Metric {
  id: string;
  /** Empty for portfolio-wide fields, i.e. the PAI inputs asked of every company. */
  companyId?: string;
  kind: 'impact_kpi' | 'adverse_impact';
  kpiType?: KpiType;
  label: string;
  definition: string;
  unit: string;
  valueType: 'number' | 'integer' | 'boolean';
  /** Allows negative numbers, e.g. a negative gender pay gap. */
  allowNegative?: boolean;
  cadence: Cadence;
  /** Cumulative KPIs never go down except as a correction. */
  cumulative?: boolean;
  sdg?: number;
  /** e.g. 'Table 1, #13', with exact wording from research/pai_table1.json. */
  paiIndicator?: string;
  /** Verbatim RTS indicator name and metric, shown as the fund-level definition. */
  paiIndicatorName?: string;
  paiMetric?: string;
  /** Weight in the company's achievement score (WS p.5). 0 = reported, not weighted. */
  weight?: number;
  /** End-of-year targets by year (annual targets for years 1–3). */
  annualTargets?: Record<number, number>;
  /** Long-term target for the holding period. */
  longTermTarget?: number;
  longTermTargetYear?: number;
  direction: 'increase' | 'decrease';
}

export interface Value {
  metricId: string;
  companyId: string;
  /** '2026-Q3' for quarterly, '2026' for annual. */
  period: string;
  value: number | boolean | null;
  isEstimate: boolean;
  evidenceNote?: string;
  comment?: string;
  status: ValueStatus;
  submittedAt?: string;
  reviewedAt?: string;
  /** The impact team's note when a value is queried. */
  reviewNote?: string;
}

export type Actor = 'founder' | 'impact_team' | 'platform_team';

export interface AuditEntry {
  at: string;
  actor: Actor;
  companyId: string;
  metricId?: string;
  requestId?: string;
  action: string;
  from?: unknown;
  to?: unknown;
  note?: string;
}

export interface Helper {
  id: string;
  kind: 'venture_partner' | 'corporate' | 'team';
  name: string;
  title: string;
  org?: string;
  expertise: CategoryId[];
  tags: string[];
  sectors: string[];
  geos: string[];
  capacityPerQuarter: number;
}

export type RequestStatus = 'new' | 'intro_drafted' | 'intro_sent' | 'resolved';

export interface HelpRequest {
  id: string;
  companyId: string;
  createdAt: string;
  quarter: string;
  category: CategoryId;
  text: string;
  tags: string[];
  urgency: Urgency;
  status: RequestStatus;
  helperId?: string;
  peerCompanyId?: string;
  introSentAt?: string;
  resolvedAt?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
}

export interface CheckIn {
  id: string;
  companyId: string;
  quarter: string;
  startedAt: string;
  submittedAt?: string;
  fieldsShown: number;
  fieldsPrefilled: number;
  /** Fields whose value the founder changed from the pre-filled one. */
  fieldsChanged?: number;
}

export interface DemoState {
  version: 2;
  companies: Company[];
  metrics: Metric[];
  values: Value[];
  helpers: Helper[];
  requests: HelpRequest[];
  checkIns: CheckIn[];
  audit: AuditEntry[];
}
