import { describe, expect, it } from 'vitest';
import { checkPlausibility, isCarriedForward } from './plausibility';

describe('checkPlausibility (limit ±50%)', () => {
  it('flags a jump: 1,150 → 1,900 is +65%', () => {
    const r = checkPlausibility({ previous: 1150, next: 1900, previousPeriod: '2026-Q2', cumulative: true });
    expect(r.needsNote).toBe(true);
    expect(r.reason).toBe('jump');
    expect(r.change).toBeCloseTo(750 / 1150, 10);
    expect(r.message).toBe('This is 65% above 2026-Q2 (1,150). Add a one-line note or evidence before you submit.');
  });
  it('accepts a normal change: 640 → 700 is +9%', () => {
    const r = checkPlausibility({ previous: 640, next: 700, cumulative: true });
    expect(r.needsNote).toBe(false);
    expect(r.change).toBeCloseTo(60 / 640, 10);
  });
  it('the limit is exclusive: exactly +50% passes, +51% does not', () => {
    expect(checkPlausibility({ previous: 100, next: 150 }).needsNote).toBe(false);
    expect(checkPlausibility({ previous: 100, next: 151 }).needsNote).toBe(true);
    expect(checkPlausibility({ previous: 100, next: 49 }).reason).toBe('jump'); // −51%, not cumulative
  });
  it('flags any decrease of a cumulative KPI', () => {
    const r = checkPlausibility({ previous: 910, next: 900, previousPeriod: '2026-Q2', cumulative: true });
    expect(r.reason).toBe('decrease');
    expect(r.message).toContain('Cumulative numbers do not go down');
  });
  it('accepts a small decrease of a non-cumulative KPI: 5.4 → 5.0', () => {
    expect(checkPlausibility({ previous: 5.4, next: 5.0, cumulative: false }).needsNote).toBe(false);
  });
  it('needs a note for the first non-zero value after 0', () => {
    expect(checkPlausibility({ previous: 0, next: 5 }).needsNote).toBe(true);
    expect(checkPlausibility({ previous: 0, next: 0 }).needsNote).toBe(false);
  });
  it('says nothing without a previous value', () => {
    expect(checkPlausibility({ previous: undefined, next: 5 }).needsNote).toBe(false);
    expect(checkPlausibility({ previous: 5, next: null }).needsNote).toBe(false);
  });
});

describe('isCarriedForward', () => {
  it('flags a cumulative quarterly KPI submitted at last quarter\'s exact value', () => {
    expect(isCarriedForward({ previous: 20, next: 20, cumulative: true, quarterly: true })).toBe(true);
    expect(isCarriedForward({ previous: 20, next: 21, cumulative: true, quarterly: true })).toBe(false);
  });
  it('leaves out annual fields, non-cumulative KPIs and first values', () => {
    expect(isCarriedForward({ previous: 3, next: 3, cumulative: true, quarterly: false })).toBe(false);
    expect(isCarriedForward({ previous: 4.5, next: 4.5, cumulative: false, quarterly: true })).toBe(false);
    expect(isCarriedForward({ previous: undefined, next: 0, cumulative: true, quarterly: true })).toBe(false);
  });
});
