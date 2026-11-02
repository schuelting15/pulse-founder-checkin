import { describe, expect, it } from 'vitest';
import { dueMetrics, isDue, periodFor, prefill, upcomingAnnualCount } from './cadence';
import { kpi, val } from './fixtures.test-helpers';
import type { Metric } from './types';

const quarterly = kpi({ id: 'q', companyId: 'h' });
const otherCompany = kpi({ id: 'other', companyId: 'z' });
const annual = (id: string): Metric => ({ id, kind: 'adverse_impact', label: id, definition: '', unit: 'tCO2e', valueType: 'number', cadence: 'annual', direction: 'decrease' });
const oneTime: Metric = { ...annual('founding'), cadence: 'one-time' };
const metrics = [quarterly, otherCompany, annual('scope1'), annual('scope2'), oneTime];

describe('cadence', () => {
  it('quarterly fields are due every quarter; annual only in Q4; one-time never', () => {
    expect(['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4'].map((q) => isDue(quarterly, q))).toEqual([true, true, true, true]);
    expect(['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4'].map((q) => isDue(annual('a'), q))).toEqual([false, false, false, true]);
    expect(isDue(oneTime, '2026-Q4')).toBe(false);
  });
  it('a Q3 check-in shows only the company’s quarterly KPIs', () => {
    expect(dueMetrics(metrics, 'h', '2026-Q3').map((m) => m.id)).toEqual(['q']);
  });
  it('the Q4 check-in adds the annual fields, reported for the calendar year', () => {
    expect(dueMetrics(metrics, 'h', '2026-Q4').map((m) => m.id)).toEqual(['q', 'scope1', 'scope2']);
    expect(periodFor(annual('scope1'), '2026-Q4')).toBe('2026');
    expect(periodFor(quarterly, '2026-Q4')).toBe('2026-Q4');
  });
  it('counts the annual fields still to come', () => {
    expect(upcomingAnnualCount(metrics, 'h', '2026-Q3')).toBe(2);
    expect(upcomingAnnualCount(metrics, 'h', '2026-Q4')).toBe(0);
  });
});

describe('prefill', () => {
  const values = [
    val('q', 'h', '2026-Q1', 450),
    val('q', 'h', '2026-Q2', 640),
    val('scope1', 'h', '2025', 12),
  ];
  it('quarterly: from the previous quarter', () => {
    const p = prefill(values, quarterly, 'h', '2026-Q3');
    expect(p.value?.value).toBe(640);
    expect(p.fromPeriod).toBe('2026-Q2');
  });
  it('annual: from last year', () => {
    expect(prefill(values, annual('scope1'), 'h', '2026-Q4').value?.value).toBe(12);
  });
  it('falls back to the latest earlier value when last period is missing', () => {
    expect(prefill([val('q', 'h', '2026-Q1', 450)], quarterly, 'h', '2026-Q3').fromPeriod).toBe('2026-Q1');
  });
  it('returns the value already given this period (e.g. a queried value being answered)', () => {
    const own = [...values, val('q', 'h', '2026-Q3', 700, { status: 'queried' })];
    expect(prefill(own, quarterly, 'h', '2026-Q3').value?.value).toBe(700);
  });
  it('is empty without history', () => {
    expect(prefill([], quarterly, 'h', '2026-Q3').value).toBeUndefined();
  });
});
