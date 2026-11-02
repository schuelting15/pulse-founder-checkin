// Explainable matching. Deterministic: ties are broken by name.
// helper score = 3·[category ∈ expertise] + 1·min(2, |tags ∩ helper.tags|) + 2·[sector ∈ sectors]
//              + 1·[country or target market ∈ geos] + 2·pastSuccess(0–1) − 1·(intros used ÷ capacity)
// Helpers at capacity are excluded. Every term that scores becomes a reason chip.
import {
  COUNTRY_NAMES,
  GEO_KEYWORDS,
  MATCH_TOP_HELPERS,
  MATCH_TOP_PEERS,
  MATCH_WEIGHTS,
  PAST_SUCCESS_MIN_RATING,
  PEER_DINNER_MIN_COMPANIES,
  PEER_MIN_RATING,
  REQUEST_CATEGORIES,
  STAGES,
  TAG_KEYWORDS,
  categoryNoun,
  type CategoryId,
  type MatchWeights,
} from './config';
import type { Company, Helper, HelpRequest } from './types';

export interface MatchContext {
  companies: Company[];
  helpers: Helper[];
  requests: HelpRequest[];
  quarter: string;
  /** Defaults to config.MATCH_WEIGHTS; pass other weights to compare scorings. */
  weights?: MatchWeights;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Acronyms (all caps) match case-sensitively as whole words; other keywords case-insensitively. */
function mentions(text: string, keyword: string): boolean {
  const caps = keyword === keyword.toUpperCase() && /[A-Z]/.test(keyword);
  return new RegExp(`(^|[^A-Za-z])${escape(keyword)}([^A-Za-z]|$)`, caps ? '' : 'i').test(text);
}

export const deriveTags = (text: string) => Object.keys(TAG_KEYWORDS).filter((tag) => TAG_KEYWORDS[tag].some((k) => mentions(text, k)));
export const deriveGeos = (text: string) => Object.keys(GEO_KEYWORDS).filter((geo) => GEO_KEYWORDS[geo].some((k) => mentions(text, k)));

const ACTIVE: HelpRequest['status'][] = ['intro_drafted', 'intro_sent', 'resolved'];

/** Intros a helper has taken on this quarter. */
export const introsUsed = (helperId: string, requests: HelpRequest[], quarter: string) =>
  requests.filter((r) => r.helperId === helperId && r.quarter === quarter && ACTIVE.includes(r.status)).length;

/** Share of the helper's rated intros rated ≥ 4, and the best one (for the reason chip). */
export function pastSuccess(helperId: string, requests: HelpRequest[]): { share: number; best?: HelpRequest } {
  const rated = requests.filter((r) => r.helperId === helperId && r.rating !== undefined);
  if (rated.length === 0) return { share: 0 };
  const good = rated.filter((r) => (r.rating as number) >= PAST_SUCCESS_MIN_RATING);
  const best = [...rated].sort((a, b) => (b.rating as number) - (a.rating as number) || (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? ''))[0];
  return { share: good.length / rated.length, best };
}

const tagLabel = (t: string) => t.replace(/-/g, ' ');
const round2 = (x: number) => Math.round(x * 100) / 100;

export interface ScoreParts {
  category: number;
  tags: number;
  sector: number;
  geo: number;
  pastSuccess: number;
  load: number;
}

export interface HelperMatch {
  helper: Helper;
  score: number;
  parts: ScoreParts;
  reasons: string[];
  used: number;
  capacity: number;
}

/** What a helper is scored against: one request, or a theme shared by several companies (peer dinner). */
export interface Need {
  category: CategoryId;
  tags: string[];
  sectors: string[];
  geos: string[];
}

export function scoreHelper(helper: Helper, need: Need, ctx: MatchContext): HelperMatch | null {
  const used = introsUsed(helper.id, ctx.requests, ctx.quarter);
  if (used >= helper.capacityPerQuarter) return null; // at capacity: excluded
  const W = ctx.weights ?? MATCH_WEIGHTS;
  const sharedTags = need.tags.filter((t) => helper.tags.includes(t));
  const sector = need.sectors.find((s) => helper.sectors.includes(s));
  const geo = need.geos.find((g) => helper.geos.includes(g));
  const past = pastSuccess(helper.id, ctx.requests);
  const parts: ScoreParts = {
    category: helper.expertise.includes(need.category) ? W.category : 0,
    tags: W.tagEach * Math.min(W.tagCap, sharedTags.length),
    sector: sector ? W.sector : 0,
    geo: geo ? W.geo : 0,
    pastSuccess: W.pastSuccess * past.share,
    load: -W.load * (used / helper.capacityPerQuarter),
  };
  const reasons: string[] = [];
  if (parts.category) reasons.push(`Expertise: ${categoryNoun(need.category)}`);
  if (sharedTags.length) reasons.push(`Shared tags: ${sharedTags.slice(0, W.tagCap).map(tagLabel).join(', ')}`);
  if (sector) reasons.push(`Works in ${sector}`);
  if (geo) reasons.push(`Covers ${COUNTRY_NAMES[geo] ?? geo}`);
  if (past.best && (past.best.rating as number) >= PAST_SUCCESS_MIN_RATING)
    reasons.push(`Rated ${past.best.rating}/5 on a ${categoryNoun(past.best.category)} intro in ${past.best.quarter}`);
  reasons.push(`${helper.capacityPerQuarter - used} of ${helper.capacityPerQuarter} intro slots free`);
  const score = round2(Object.values(parts).reduce((s, x) => s + x, 0));
  return { helper, score, parts, reasons, used, capacity: helper.capacityPerQuarter };
}

const byScoreThenName = (a: { score: number; name: string }, b: { score: number; name: string }) =>
  b.score - a.score || a.name.localeCompare(b.name);

export function needFor(request: Pick<HelpRequest, 'category' | 'text' | 'tags' | 'companyId'>, ctx: MatchContext): Need {
  const company = ctx.companies.find((c) => c.id === request.companyId);
  const tags = request.tags.length ? request.tags : deriveTags(request.text);
  return {
    category: request.category,
    tags,
    sectors: company ? [company.sector] : [],
    // Places named in the request come first, so the reason chip names the market the founder asked about.
    geos: [...new Set([...deriveGeos(request.text), ...(company ? [company.country, ...company.markets] : [])])],
  };
}

export function matchHelpers(request: Pick<HelpRequest, 'category' | 'text' | 'tags' | 'companyId'>, ctx: MatchContext, top = MATCH_TOP_HELPERS): HelperMatch[] {
  const need = needFor(request, ctx);
  // "Something else" carries no category signal, so sector and track record alone would pick a
  // Venture Partner for an unknown need. It goes to whoever triages it instead.
  const candidates = request.category === 'other' ? ctx.helpers.filter((h) => h.expertise.includes('other')) : ctx.helpers;
  return candidates
    .map((h) => scoreHelper(h, need, ctx))
    .filter((m): m is HelperMatch => m !== null)
    .sort((a, b) => byScoreThenName({ score: a.score, name: a.helper.name }, { score: b.score, name: b.helper.name }))
    .slice(0, top);
}

export interface PeerMatch {
  company: Company;
  solved: HelpRequest;
  score: number;
  reasons: string[];
}

const stageIndex = (s: string) => STAGES.indexOf(s as (typeof STAGES)[number]);
const shorten = (s: string, n = 48) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/**
 * Portfolio peers: companies that resolved a request in the same category with a rating ≥ 4.
 * Preference: one stage ahead (+2), same sector (+1); then the better rating, then name.
 * "Something else" requests have nothing in common to match on, so they get no peers.
 */
export function matchPeers(request: Pick<HelpRequest, 'category' | 'companyId'>, ctx: MatchContext, top = MATCH_TOP_PEERS): PeerMatch[] {
  const me = ctx.companies.find((c) => c.id === request.companyId);
  if (!me || request.category === 'other') return [];
  const best = new Map<string, HelpRequest>();
  for (const r of ctx.requests) {
    if (r.companyId === me.id || r.category !== request.category || r.status !== 'resolved' || (r.rating ?? 0) < PEER_MIN_RATING) continue;
    const prev = best.get(r.companyId);
    if (!prev || (r.rating ?? 0) > (prev.rating ?? 0)) best.set(r.companyId, r);
  }
  const out: PeerMatch[] = [];
  for (const [companyId, solved] of best) {
    const company = ctx.companies.find((c) => c.id === companyId);
    if (!company) continue;
    const oneAhead = stageIndex(company.stage) === stageIndex(me.stage) + 1;
    const sameSector = company.sector === me.sector;
    const reasons: string[] = [];
    if (oneAhead) reasons.push(`${company.stage}, one stage ahead`);
    else reasons.push(company.stage === me.stage ? `Same stage: ${company.stage}` : company.stage);
    if (sameSector) reasons.push(`Same sector: ${company.sector}`);
    reasons.push(`Solved "${shorten(solved.text)}" in ${solved.quarter}, rated ${solved.rating}/5`);
    out.push({ company, solved, score: (oneAhead ? 2 : 0) + (sameSector ? 1 : 0) + (solved.rating ?? 0) / 10, reasons });
  }
  return out.sort((a, b) => byScoreThenName({ score: a.score, name: a.company.name }, { score: b.score, name: b.company.name })).slice(0, top);
}

export interface PeerDinner {
  category: CategoryId;
  title: string;
  companies: Company[];
  requests: HelpRequest[];
  host?: HelperMatch;
}

/** A peer dinner when ≥ 3 companies have open requests in one category this quarter. */
export function peerDinners(ctx: MatchContext): PeerDinner[] {
  const out: PeerDinner[] = [];
  for (const cat of REQUEST_CATEGORIES) {
    if (!cat.dinner) continue; // "Something else" shares no theme to dine on
    const open = ctx.requests.filter((r) => r.category === cat.id && r.quarter === ctx.quarter && r.status !== 'resolved');
    const companyIds = [...new Set(open.map((r) => r.companyId))];
    if (companyIds.length < PEER_DINNER_MIN_COMPANIES) continue;
    const companies = companyIds
      .map((id) => ctx.companies.find((c) => c.id === id))
      .filter((c): c is Company => !!c)
      .sort((a, b) => a.name.localeCompare(b.name));
    const need: Need = {
      category: cat.id,
      tags: [...new Set(open.flatMap((r) => (r.tags.length ? r.tags : deriveTags(r.text))))],
      sectors: [...new Set(companies.map((c) => c.sector))],
      geos: [...new Set(companies.flatMap((c) => [c.country, ...c.markets]))],
    };
    const host = ctx.helpers
      .filter((h) => h.kind === 'venture_partner')
      .map((h) => scoreHelper(h, need, ctx))
      .filter((m): m is HelperMatch => m !== null)
      .sort((a, b) => byScoreThenName({ score: a.score, name: a.helper.name }, { score: b.score, name: b.helper.name }))[0];
    out.push({ category: cat.id, title: cat.dinner, companies, requests: open, host });
  }
  return out.sort((a, b) => b.companies.length - a.companies.length);
}
