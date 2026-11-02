// The seed tells the story the demo depends on.
import { describe, expect, it } from 'vitest';
import { achievementByFund, portfolioAchievement } from '../lib/aggregate';
import { CURRENT_QUARTER } from '../lib/config';
import { dueMetrics, prefill, upcomingAnnualCount } from '../lib/cadence';
import { matchHelpers, matchPeers, peerDinners } from '../lib/match';
import { checkPlausibility } from '../lib/plausibility';
import { companyStatus, kpiStatus } from '../lib/status';
import { DEMO_COMPANY_ID, createSeed } from './seed';

const s = createSeed();
const ctx = { companies: s.companies, helpers: s.helpers, requests: s.requests, quarter: CURRENT_QUARTER };

describe('seed shape', () => {
  it('12 companies, three stages, at least 7 countries, unique names', () => {
    expect(s.companies).toHaveLength(12);
    expect(new Set(s.companies.map((c) => c.stage))).toEqual(new Set(['Seed', 'Series A', 'Series B']));
    expect(new Set(s.companies.map((c) => c.country)).size).toBeGreaterThanOrEqual(7);
    expect(new Set(s.companies.map((c) => c.name)).size).toBe(12);
  });
  it('every company has 1–2 weighted impact KPIs and a one-sentence impact thesis', () => {
    for (const c of s.companies) {
      const weighted = s.metrics.filter((m) => m.companyId === c.id && m.kind === 'impact_kpi' && (m.weight ?? 0) > 0);
      expect(weighted.length).toBeGreaterThanOrEqual(1);
      expect(weighted.length).toBeLessThanOrEqual(2);
      expect(weighted.reduce((x, m) => x + (m.weight ?? 0), 0)).toBeCloseTo(1, 10);
      expect(c.impactThesis.split('. ').length).toBe(1);
    }
  });
  it('helpers: 8 Venture Partners, 4 corporates, 2 team', () => {
    const count = (k: string) => s.helpers.filter((h) => h.kind === k).length;
    expect([count('venture_partner'), count('corporate'), count('team')]).toEqual([8, 4, 2]);
  });
  it('requests: 14 resolved with ratings in Q1–Q2, 5 open in Q3 of which 3 hiring', () => {
    const resolved = s.requests.filter((r) => r.status === 'resolved');
    expect(resolved).toHaveLength(14);
    expect(resolved.every((r) => r.rating && ['2026-Q1', '2026-Q2'].includes(r.quarter))).toBe(true);
    const open = s.requests.filter((r) => r.status !== 'resolved');
    expect(open).toHaveLength(5);
    expect(open.every((r) => r.quarter === CURRENT_QUARTER)).toBe(true);
    expect(open.filter((r) => r.category === 'hiring')).toHaveLength(3);
  });
  it('founder emails are on example.com', () => {
    expect(s.companies.every((c) => c.founder.email.endsWith('@example.com'))).toBe(true);
  });
});

describe('the 2026-Q3 story', () => {
  const statuses = Object.fromEntries(s.companies.map((c) => [c.id, companyStatus(s.metrics, s.values, c.id, CURRENT_QUARTER)]));
  const tally = (st: string) => Object.values(statuses).filter((x) => x === st).length;
  it('7 on track, 3 at risk, 1 off track, 1 not checked in (the demo company)', () => {
    expect([tally('on_track'), tally('at_risk'), tally('off_track'), tally('missing')]).toEqual([7, 3, 1, 1]);
    expect(statuses[DEMO_COMPANY_ID]).toBe('missing');
  });
  it('2 estimates and 1 queried value this quarter; 11 of 12 check-ins received', () => {
    const q3 = s.values.filter((v) => v.period === CURRENT_QUARTER);
    expect(q3.filter((v) => v.isEstimate)).toHaveLength(2);
    expect(q3.filter((v) => v.status === 'queried')).toHaveLength(1);
    expect(s.checkIns.filter((c) => c.quarter === CURRENT_QUARTER && c.submittedAt)).toHaveLength(11);
  });
  it('one seeded submission carries a plausibility flag with its evidence note', () => {
    const t = s.values.find((v) => v.metricId === 'tangfarm_harvest' && v.period === CURRENT_QUARTER)!;
    expect(checkPlausibility({ previous: 90, next: t.value as number, cumulative: true }).needsNote).toBe(true);
    expect(t.evidenceNote).toBeTruthy();
  });
  it('2025 impact achieved vs 2025 target, capital-weighted per fund: Fund II ≈ 108%, Fund I ≈ 113%', () => {
    // Fund I: (8 × 1.225 + 9 × 1.05) / 17 = 19.25 / 17. Fund II: 32.8255 / 30.5 (all 12 pooled: 52.0755 / 47.5 ≈ 110%).
    const [fund2, fund1] = achievementByFund(s.companies, s.metrics, s.values, { kind: 'annual', year: 2025 });
    expect([fund2.fund, fund1.fund]).toEqual(['Fund II', 'Fund I']);
    expect(fund1.ratio).toBeCloseTo(19.25 / 17, 6);
    expect(fund2.ratio).toBeCloseTo(32.8255 / 30.5, 3);
    expect(fund1.companiesIncluded + fund2.companiesIncluded).toBe(12);
    expect(portfolioAchievement(s.companies, s.metrics, s.values, { kind: 'annual', year: 2025 }).ratio).toBeCloseTo(52.0755 / 47.5, 3);
  });
});

describe('the demo path', () => {
  const metric = (id: string) => s.metrics.find((m) => m.id === id)!;
  it('the Q3 check-in shows 3 quarterly fields, all pre-filled, and 20 annual fields wait for Q4', () => {
    const due = dueMetrics(s.metrics, DEMO_COMPANY_ID, CURRENT_QUARTER);
    expect(due.map((m) => m.id)).toEqual(['hearthline_installs', 'hearthline_co2', 'hearthline_partners']);
    expect(due.every((m) => prefill(s.values, m, DEMO_COMPANY_ID, CURRENT_QUARTER).value !== undefined)).toBe(true);
    expect(upcomingAnnualCount(s.metrics, DEMO_COMPANY_ID, CURRENT_QUARTER)).toBe(20);
  });
  it('installs: pre-filled 640 is at risk; 700 is on track', () => {
    expect(kpiStatus(metric('hearthline_installs'), DEMO_COMPANY_ID, CURRENT_QUARTER, s.values, 640).status).toBe('at_risk');
    expect(kpiStatus(metric('hearthline_installs'), DEMO_COMPANY_ID, CURRENT_QUARTER, s.values, 700).status).toBe('on_track');
  });
  it('CO2e: 1,150 → 1,900 triggers the plausibility prompt', () => {
    expect(checkPlausibility({ previous: 1150, next: 1900, cumulative: true }).needsNote).toBe(true);
  });
  const request = { companyId: DEMO_COMPANY_ID, category: 'hiring' as const, text: 'Hiring our first US sales lead', tags: [] };
  it('the top Venture Partner has reason chips; a Series A peer solved the same problem', () => {
    const [top] = matchHelpers(request, ctx);
    expect(top.helper.name).toBe('Ingrid Holm');
    expect(top.reasons).toContain('Rated 5/5 on a hiring intro in 2026-Q2');
    const [peer] = matchPeers(request, ctx);
    expect(peer.company.name).toBe('Tessel Grid');
    expect(peer.reasons[0]).toBe('Series A, one stage ahead');
  });
  it('the hiring peer dinner has 3 founders before the demo and 4 after the new request', () => {
    expect(peerDinners(ctx)[0].companies).toHaveLength(3);
    const after = [...s.requests, { ...request, id: 'demo', createdAt: '2026-10-25T10:00:00Z', quarter: CURRENT_QUARTER, urgency: 'This quarter' as const, status: 'new' as const }];
    const d = peerDinners({ ...ctx, requests: after })[0];
    expect(d.companies).toHaveLength(4);
    expect(d.host?.helper.kind).toBe('venture_partner');
  });
});
