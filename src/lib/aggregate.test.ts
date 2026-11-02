import { describe, expect, it } from 'vitest';
import { achievementByFund, achievementRatio, companyAchievement, portfolioAchievement } from './aggregate';
import { company, kpi, val } from './fixtures.test-helpers';

// X (€3M): one KPI, 2025 actual 120 vs target 100 → 1.20.
// Y (€1M): two KPIs weighted 0.5/0.5: 50/100 = 0.5 and 300/200 = 1.5 → 1.00.
// Portfolio = (3·1.20 + 1·1.00) / 4 = 4.6 / 4 = 1.15.
const X = company({ id: 'x', investedCapitalEUR: 3_000_000 });
const Y = company({ id: 'y', investedCapitalEUR: 1_000_000 });
const Z = company({ id: 'z', investedCapitalEUR: 5_000_000 }); // no data → left out of the denominator
const metrics = [
  kpi({ id: 'a', companyId: 'x', annualTargets: { 2025: 100 }, longTermTarget: 400 }),
  kpi({ id: 'b', companyId: 'y', weight: 0.5, annualTargets: { 2025: 100 } }),
  kpi({ id: 'c', companyId: 'y', weight: 0.5, annualTargets: { 2025: 200 } }),
  kpi({ id: 'unweighted', companyId: 'y', weight: 0, annualTargets: { 2025: 1 } }), // reported, not weighted
  kpi({ id: 'z1', companyId: 'z', annualTargets: { 2026: 10 } }),
];
const values = [
  val('a', 'x', '2025-Q3', 90),
  val('a', 'x', '2025-Q4', 120), // the year's latest reported value counts
  val('b', 'y', '2025-Q4', 50),
  val('c', 'y', '2025-Q4', 300),
  val('unweighted', 'y', '2025-Q4', 1000),
  val('a', 'x', '2026-Q2', 200, { status: 'queried' }), // not reported
  val('a', 'x', '2026-Q1', 160),
];

describe('achievementRatio', () => {
  it('increase: actual ÷ target, uncapped', () => {
    expect(achievementRatio(120, 100, 'increase')).toBeCloseTo(1.2, 10);
    expect(achievementRatio(344, 100, 'increase')).toBeCloseTo(3.44, 10);
    expect(achievementRatio(5, 0, 'increase')).toBeNull();
  });
  it('decrease: (baseline − actual) / (baseline − target)', () => {
    expect(achievementRatio(5.0, 4.5, 'decrease', 6.0)).toBeCloseTo(2 / 3, 10);
    expect(achievementRatio(5.0, 4.5, 'decrease')).toBeNull();
  });
});

describe('companyAchievement', () => {
  it('weights KPIs and ignores weight-0 KPIs', () => {
    expect(companyAchievement(X, metrics, values, { kind: 'annual', year: 2025 }).ratio).toBeCloseTo(1.2, 10);
    expect(companyAchievement(Y, metrics, values, { kind: 'annual', year: 2025 }).ratio).toBeCloseTo(1.0, 10);
  });
  it('long-term mode uses the latest reported value against the long-term target', () => {
    // latest reported up to 2026-Q3 is 160 (2026-Q2 is queried) → 160 / 400 = 0.4
    expect(companyAchievement(X, metrics, values, { kind: 'longTerm', upTo: '2026-Q3' }).ratio).toBeCloseTo(0.4, 10);
  });
});

describe('portfolioAchievement', () => {
  it('is weighted by invested capital: (3·1.2 + 1·1.0) / 4 = 1.15', () => {
    const p = portfolioAchievement([X, Y, Z], metrics, values, { kind: 'annual', year: 2025 });
    expect(p.ratio).toBeCloseTo(1.15, 10);
    expect(p.companiesIncluded).toBe(2);
    expect(p.companiesTotal).toBe(3);
  });
  it('is null when no company has data', () => {
    expect(portfolioAchievement([Z], metrics, values, { kind: 'annual', year: 2025 }).ratio).toBeNull();
  });
});

describe('achievementByFund', () => {
  it('keeps funds apart: X alone in Fund I = 1.20, Y alone in Fund II = 1.00, never the pooled 1.15', () => {
    const X1 = { ...X, fund: 'Fund I' as const };
    const funds = achievementByFund([X1, Y, Z], metrics, values, { kind: 'annual', year: 2025 });
    expect(funds.map((f) => f.fund)).toEqual(['Fund II', 'Fund I']); // newest first
    expect(funds[0].ratio).toBeCloseTo(1.0, 10);
    expect(funds[0].companiesIncluded).toBe(1); // Y; Z (Fund II) has no 2025 data
    expect(funds[0].companiesTotal).toBe(2);
    expect(funds[1].ratio).toBeCloseTo(1.2, 10);
  });
});
