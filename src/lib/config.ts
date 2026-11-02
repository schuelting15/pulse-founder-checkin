// Every rule Pulse applies, in one file, so a reviewer can trace any badge, flag or match back to
// a single constant.

/** The check-in being collected. Q3 check-ins are filed in October, after the quarter ends. */
export const CURRENT_QUARTER = '2026-Q3';

/** localStorage key for the demo state. */
export const STORAGE_KEY = 'pulse-demo-v3';

// ---- Impact status (in-year early warning; Pulse's own construct) -----------------------------
// progress = (value − baseline) / (target − baseline), with baseline = last year's end value and
// target = this year's end-of-year target (targets are end-of-year values). expected = q/4.
export const STATUS_THRESHOLDS = {
  /** on track if progress ≥ expected − onTrackSlack */
  onTrackSlack: 0.1,
  /** at risk if progress ≥ expected − atRiskSlack, otherwise off track */
  atRiskSlack: 0.25,
} as const;

// ---- Plausibility ------------------------------------------------------------------------------
export const PLAUSIBILITY = {
  /** A change larger than ±50% against the last period needs a comment or evidence note. */
  maxRelativeChange: 0.5,
  /** A cumulative KPI that goes down needs a note (it should only go down as a correction). */
  flagCumulativeDecrease: true,
} as const;

// ---- Matching -----------------------------------------------------------------------------------
// score = 3·[category ∈ expertise] + 1·min(2, |tags ∩ helper.tags|) + 2·[sector ∈ sectors]
//       + 1·[country or target market ∈ geos] + 2·pastSuccess(0–1) − 1·(intros used ÷ capacity)
export const MATCH_WEIGHTS = {
  category: 3,
  tagEach: 1,
  tagCap: 2,
  sector: 2,
  geo: 1,
  pastSuccess: 2,
  load: 1,
} as const;
export type MatchWeights = { [K in keyof typeof MATCH_WEIGHTS]: number };
export const MATCH_TOP_HELPERS = 3;
export const MATCH_TOP_PEERS = 2;
/** A peer qualifies if it resolved a request in the same category rated at least this. */
export const PEER_MIN_RATING = 4;
/** pastSuccess = share of a helper's rated intros with at least this rating. */
export const PAST_SUCCESS_MIN_RATING = 4;

/** Suggest a peer dinner when this many companies have open requests in one category this quarter. */
export const PEER_DINNER_MIN_COMPANIES = 3;

/** Founders add 0–2 requests per check-in. */
export const MAX_REQUESTS_PER_CHECKIN = 2;

/** Stage order for "one stage ahead". */
export const STAGES = ['Seed', 'Series A', 'Series B'] as const;
export type Stage = (typeof STAGES)[number];

/** HelpRequest.urgency. */
export const URGENCIES = ['This month', 'This quarter', 'Whenever'] as const;
export type Urgency = (typeof URGENCIES)[number];

/** Request taxonomy: eight categories plus "Something else". */
export const REQUEST_CATEGORIES = [
  { id: 'hiring', label: 'Hiring & talent', noun: 'hiring', dinner: 'Making the first senior hires' },
  { id: 'customers', label: 'Customer & corporate intros', noun: 'customer', dinner: 'Selling to large corporates' },
  { id: 'fundraising', label: 'Fundraising & investors', noun: 'fundraising', dinner: 'Preparing the next round' },
  { id: 'responsible_ai', label: 'Responsible AI', noun: 'responsible AI', dinner: 'Responsible AI in practice' },
  { id: 'esg_reporting', label: 'ESG, carbon & reporting', noun: 'ESG', dinner: 'Carbon accounting at seed stage' },
  { id: 'policies_governance', label: 'Policies & governance', noun: 'governance', dinner: 'Building a board' },
  { id: 'grants', label: 'Grants & public funding', noun: 'grant', dinner: 'Winning EU and national grants' },
  { id: 'regulation_market_entry', label: 'Regulation & market entry', noun: 'regulation', dinner: 'Entering a new EU market' },
  // Escape hatch: goes to the Platform team, gets no peers and no dinner. The count of these
  // requests is how a missing category shows up, instead of guessing one in advance.
  { id: 'other', label: 'Something else', noun: 'general', dinner: null },
] as const;
export type CategoryId = (typeof REQUEST_CATEGORIES)[number]['id'];
export const categoryLabel = (id: string) => REQUEST_CATEGORIES.find((c) => c.id === id)?.label ?? id;
export const categoryNoun = (id: string) => REQUEST_CATEGORIES.find((c) => c.id === id)?.noun ?? id;

/**
 * Tags are derived from the request text by keyword, so matching stays explainable without AI
 * (no AI tagging). Matching is case-sensitive for acronyms, case-insensitive otherwise.
 */
export const TAG_KEYWORDS: Record<string, string[]> = {
  'us-expansion': ['US', 'United States', 'North America'],
  'sales-hiring': ['sales lead', 'sales', 'account executive', 'commercial'],
  'engineering-hiring': ['engineer', 'engineering', 'CTO'],
  'operations-hiring': ['operations', 'plant manager', 'farm operations'],
  'ai-governance': ['AI', 'model', 'algorithm'],
  procurement: ['procurement', 'tender', 'buyer'],
  'series-a': ['Series A', 'seed extension'],
  'series-b': ['Series B', 'growth round'],
  debt: ['debt', 'loan facility', 'credit line'],
  'scope-3': ['scope 3', 'Scope 3', 'emissions'],
  taxonomy: ['Taxonomy', 'taxonomy'],
  board: ['board'],
  eic: ['EIC', 'Innovation Fund', 'grant'],
  permitting: ['permit', 'permitting', 'CE marking', 'MDR'],
  utilities: ['utility', 'utilities', 'grid'],
};

/** Country codes recognised in request text, for the geo term of the score. */
export const GEO_KEYWORDS: Record<string, string[]> = {
  US: ['US', 'United States', 'North America'],
  GB: ['UK', 'Britain', 'London'],
  DE: ['Germany', 'German'],
  FR: ['France', 'French'],
  ES: ['Spain', 'Spanish'],
  NL: ['Netherlands', 'Dutch'],
  NO: ['Norway', 'Norwegian'],
  SE: ['Sweden', 'Swedish'],
  DK: ['Denmark', 'Danish'],
  FI: ['Finland', 'Finnish'],
};

export const COUNTRY_NAMES: Record<string, string> = {
  SE: 'Sweden', NL: 'Netherlands', DE: 'Germany', DK: 'Denmark', ES: 'Spain', GB: 'United Kingdom',
  NO: 'Norway', PT: 'Portugal', FI: 'Finland', EE: 'Estonia', FR: 'France', IE: 'Ireland', US: 'United States',
  BE: 'Belgium', IT: 'Italy',
};
