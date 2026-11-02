// Number, time and text formatting used across screens.

export const fmtNumber = (x: number, maxFractionDigits = 1) => x.toLocaleString('en-GB', { maximumFractionDigits: maxFractionDigits });
export const fmtPct = (x: number) => `${Math.round(x * 100)}%`;
export const fmtSignedPct = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.round(Math.abs(x) * 100)}%`;
export const fmtEUR = (x: number) => `€${fmtNumber(x / 1_000_000)}M`;

/** "2 min 10 s", "45 s", "1 h 3 min". */
export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${s % 60} s`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export const daysBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000;

/** "1.950": thousands in DE, NL, DK, ES and PT; a decimal in English. "0.125" can only be a decimal. */
const DOT_THOUSANDS_ONE_GROUP = /^-?[1-9]\d{0,2}\.\d{3}$/;

/**
 * Parse a typed number. Unambiguous forms are read the way their writer meant them: "1,010" and
 * "1 010" are thousands; "1,5" and "1.5" are decimals; "1.950,5" and "12.345.678" use dots for
 * thousands. "1.950" is ambiguous: in a whole-number field it can only mean 1950; elsewhere it stays
 * 1.95 and the field says how it read it (readingEcho). A comma followed by exactly three
 * digits is read as a thousands separator.
 */
export function parseNumberInput(raw: string, opts: { integer?: boolean } = {}): number | null {
  const s = raw.trim().replace(/\s/g, '');
  if (s === '') return null;
  const dotThousands = /^-?\d{1,3}(\.\d{3})+,\d+$/.test(s) || /^-?\d{1,3}(\.\d{3}){2,}$/.test(s) || (!!opts.integer && DOT_THOUSANDS_ONE_GROUP.test(s));
  const normalised = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)
    ? s.replace(/,/g, '')
    : dotThousands
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalised)) return Number.NaN;
  return Number(normalised);
}

/**
 * The line under a typed number when the reading isn't obvious from what was typed:
 * "1 950" → "Read as 1,950."; "1.950" in a decimal field → "Read as 1.95. If you meant 1,950, type 1950."
 * Plain digits, and input already in the display format, get no line.
 */
export function readingEcho(raw: string, opts: { integer?: boolean } = {}): string | null {
  const s = raw.trim();
  const value = parseNumberInput(s, opts);
  if (value === null || Number.isNaN(value) || !/[.,\s]/.test(s)) return null;
  const shown = fmtNumber(value, 6);
  if (!opts.integer && DOT_THOUSANDS_ONE_GROUP.test(s.replace(/\s/g, ''))) {
    const whole = Number(s.replace(/[\s.]/g, ''));
    return `Read as ${shown}. If you meant ${fmtNumber(whole, 0)}, type ${whole}.`;
  }
  return s === shown ? null : `Read as ${shown}.`;
}
