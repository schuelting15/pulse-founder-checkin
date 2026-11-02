import { describe, expect, it } from 'vitest';
import { kpi, val } from './fixtures.test-helpers';
import { companyStatus, kpiStatus, progress, statusFromProgress } from './status';

// Baseline 260 (end of 2025), target 900 (end of 2026), checked in 2026-Q3 → expected 0.75.
// on track ≥ 0.65, at risk ≥ 0.50, otherwise off track.
const installs = kpi({ id: 'installs', companyId: 'h', annualTargets: { 2026: 900 } });
const history = [val('installs', 'h', '2025-Q4', 260), val('installs', 'h', '2026-Q2', 640)];

describe('progress and thresholds', () => {
  it('progress = (value − baseline) / (target − baseline)', () => {
    expect(progress(700, 260, 900)).toBeCloseTo(440 / 640, 10); // 0.6875
  });
  it('thresholds at Q3', () => {
    expect(statusFromProgress(0.6875, 3)).toBe('on_track');
    expect(statusFromProgress(0.59375, 3)).toBe('at_risk');
    expect(statusFromProgress(0.21875, 3)).toBe('off_track');
  });
  it('a target equal to the baseline is reached or not', () => {
    expect(progress(5, 5, 5)).toBe(1);
    expect(progress(4, 5, 5, 'increase')).toBe(0);
    expect(progress(4, 5, 5, 'decrease')).toBe(1);
  });
});

describe('kpiStatus: the four cases', () => {
  it('on track: 700 → (700−260)/640 = 0.6875 ≥ 0.65', () => {
    const values = [...history, val('installs', 'h', '2026-Q3', 700, { status: 'submitted' })];
    const s = kpiStatus(installs, 'h', '2026-Q3', values);
    expect(s.status).toBe('on_track');
    expect(s.baseline).toBe(260);
    expect(s.target).toBe(900);
    expect(s.progress).toBeCloseTo(0.6875, 10);
  });
  it('at risk: 640 → 380/640 = 0.59375', () => {
    expect(kpiStatus(installs, 'h', '2026-Q3', [...history, val('installs', 'h', '2026-Q3', 640)]).status).toBe('at_risk');
  });
  it('off track: 400 → 140/640 = 0.21875', () => {
    expect(kpiStatus(installs, 'h', '2026-Q3', [...history, val('installs', 'h', '2026-Q3', 400)]).status).toBe('off_track');
  });
  it('missing: no submitted or accepted value this quarter', () => {
    expect(kpiStatus(installs, 'h', '2026-Q3', history).status).toBe('missing');
    const queried = [...history, val('installs', 'h', '2026-Q3', 700, { status: 'queried' })];
    expect(kpiStatus(installs, 'h', '2026-Q3', queried).status).toBe('missing');
  });
  it('a draft value gives a live status without being stored', () => {
    expect(kpiStatus(installs, 'h', '2026-Q3', history, 640).status).toBe('at_risk');
    expect(kpiStatus(installs, 'h', '2026-Q3', history, 700).status).toBe('on_track');
    expect(kpiStatus(installs, 'h', '2026-Q3', history, null).status).toBe('missing');
  });
  it('reduction target: default rate 6.0% → 4.5%', () => {
    const rate = kpi({ id: 'rate', companyId: 'f', cumulative: false, direction: 'decrease', annualTargets: { 2026: 4.5 } });
    const base = [val('rate', 'f', '2025-Q4', 6.0)];
    // (5.0 − 6.0) / (4.5 − 6.0) = 0.667 → on track at Q3
    expect(kpiStatus(rate, 'f', '2026-Q3', [...base, val('rate', 'f', '2026-Q3', 5.0)]).status).toBe('on_track');
    // (5.2 − 6.0) / −1.5 = 0.533 → at risk
    expect(kpiStatus(rate, 'f', '2026-Q3', [...base, val('rate', 'f', '2026-Q3', 5.2)]).status).toBe('at_risk');
    // (5.4 − 6.0) / −1.5 = 0.4 → off track
    expect(kpiStatus(rate, 'f', '2026-Q3', [...base, val('rate', 'f', '2026-Q3', 5.4)]).status).toBe('off_track');
  });
  it('no target for the year → missing', () => {
    const noTarget = kpi({ id: 'x', companyId: 'h', annualTargets: { 2025: 100 } });
    expect(kpiStatus(noTarget, 'h', '2026-Q3', [val('x', 'h', '2026-Q3', 50)]).status).toBe('missing');
  });
});

describe('companyStatus', () => {
  const op = kpi({ id: 'partners', companyId: 'h', kpiType: 'operational', weight: 0, annualTargets: { 2026: 100 } });
  const co2 = kpi({ id: 'co2', companyId: 'h', weight: 0, annualTargets: { 2026: 2400 } });
  const values = [
    ...history,
    val('installs', 'h', '2026-Q3', 700),
    val('co2', 'h', '2025-Q4', 700),
    val('co2', 'h', '2026-Q3', 1150), // (1150−700)/1700 = 0.26 → off track
    val('partners', 'h', '2025-Q4', 0),
    val('partners', 'h', '2026-Q3', 1), // operational, off track, but ignored
  ];
  it('is the worst impact KPI, ignoring operational KPIs', () => {
    expect(companyStatus([installs, co2, op], values, 'h', '2026-Q3')).toBe('off_track');
    expect(companyStatus([installs, op], values, 'h', '2026-Q3')).toBe('on_track');
  });
  it('is missing when an impact KPI has no value this quarter', () => {
    expect(companyStatus([installs, co2], history, 'h', '2026-Q3')).toBe('missing');
  });
});
