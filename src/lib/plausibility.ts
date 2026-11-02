// Plausibility against last period (config.PLAUSIBILITY). A flagged value needs a
// comment or evidence note before submit; the message says what happened in plain words.
import { PLAUSIBILITY } from './config';

export interface PlausibilityResult {
  needsNote: boolean;
  reason: 'jump' | 'decrease' | null;
  /** Relative change against the previous value, e.g. 0.65 for +65%. Null without a usable previous value. */
  change: number | null;
  message: string | null;
}

const OK: PlausibilityResult = { needsNote: false, reason: null, change: null, message: null };
const pct = (x: number) => `${Math.round(Math.abs(x) * 100)}%`;
const num = (x: number) => x.toLocaleString('en-GB');

export function checkPlausibility(args: {
  previous: number | null | undefined;
  next: number | null | undefined;
  previousPeriod?: string;
  cumulative?: boolean;
  limits?: { maxRelativeChange: number; flagCumulativeDecrease: boolean };
}): PlausibilityResult {
  const { previous, next, previousPeriod = 'last period', cumulative = false, limits = PLAUSIBILITY } = args;
  if (next === null || next === undefined || previous === null || previous === undefined) return OK;
  if (cumulative && limits.flagCumulativeDecrease && next < previous) {
    return {
      needsNote: true,
      reason: 'decrease',
      change: previous === 0 ? null : (next - previous) / Math.abs(previous),
      message: `This is lower than ${previousPeriod} (${num(previous)}). Cumulative numbers do not go down. If this is a correction, say so in a note.`,
    };
  }
  if (previous === 0) {
    return next === 0
      ? OK
      : { needsNote: true, reason: 'jump', change: null, message: `${previousPeriod} was 0. Add a one-line note or evidence for the first value.` };
  }
  const change = (next - previous) / Math.abs(previous);
  if (Math.abs(change) > limits.maxRelativeChange) {
    return {
      needsNote: true,
      reason: 'jump',
      change,
      message: `This is ${pct(change)} ${change > 0 ? 'above' : 'below'} ${previousPeriod} (${num(previous)}). Add a one-line note or evidence before you submit.`,
    };
  }
  return { ...OK, change };
}

/**
 * A cumulative quarterly KPI submitted at exactly last quarter's value. Not an error, since nothing
 * may have happened, but with pre-fill a click-through looks the same, so the reviewer sees it.
 * Annual fields are left out: many stay the same from year to year by nature.
 */
export function isCarriedForward(args: { previous: number | null | undefined; next: number | null | undefined; cumulative?: boolean; quarterly: boolean }): boolean {
  const { previous, next, cumulative = false, quarterly } = args;
  return quarterly && cumulative && previous !== null && previous !== undefined && next === previous;
}
