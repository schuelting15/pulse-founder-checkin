import { useId } from 'react';
import { kpiSeries } from '../lib/chart';
import { fmtNumber, readingEcho } from '../lib/format';
import { KPI_TYPE_LABEL } from '../lib/labels';
import type { PlausibilityResult } from '../lib/plausibility';
import type { KpiStatus } from '../lib/status';
import type { Metric, Value } from '../lib/types';
import { LazySparkline as Sparkline } from './LazySparkline';
import { StatusBadge } from './ui';

export interface FieldDraft {
  raw: string;
  bool: boolean | null;
  isEstimate: boolean;
  note: string;
  showNote: boolean;
}


export function KpiField(props: {
  metric: Metric;
  companyId: string;
  quarter: string;
  period: string;
  values: Value[];
  draft: FieldDraft;
  parsed: number | null | undefined;
  status?: KpiStatus;
  plausibility: PlausibilityResult;
  prefillFrom?: string;
  prefillValue?: Value;
  reviewNote?: string;
  error?: string;
  noteError?: string;
  onChange: (patch: Partial<FieldDraft>) => void;
}) {
  const { metric: m, draft, status, plausibility, error, noteError } = props;
  const id = useId();
  const year = Number(props.period.slice(0, 4));
  const target = m.annualTargets?.[year];
  const noteRequired = plausibility.needsNote;
  const isNumber = m.valueType !== 'boolean';
  const series = isNumber && m.kind === 'impact_kpi' ? kpiSeries(m, props.companyId, props.values, props.quarter, props.parsed ?? null) : null;
  const prev = props.prefillValue?.value;

  return (
    <section className="cell flex flex-col gap-3" aria-labelledby={`${id}-t`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-small text-ink-2">
            {m.kind === 'impact_kpi' ? KPI_TYPE_LABEL[m.kpiType ?? 'attributable_impact'] : m.paiIndicator}
            {m.sdg ? ` · SDG ${m.sdg}` : ''}
          </p>
          <h3 id={`${id}-t`} className="text-medium">
            {m.label}
          </h3>
        </div>
        {status && <StatusBadge status={status.status} />}
      </div>

      {m.kind === 'adverse_impact' && <p className="text-small">{m.paiIndicatorName}</p>}
      <p className="text-small text-ink-2">{m.definition}</p>

      {series && (
        <div>
          <Sparkline data={series} unit={m.unit} />
          <p className="text-tiny text-ink-2">Blue: actual. Dashed: path to the end-of-{year} target.</p>
        </div>
      )}

      {props.reviewNote && (
        <p className="border border-hairline p-3 text-small">
          <span className="text-ink-2">The impact team asked: </span>
          {props.reviewNote}
        </p>
      )}

      {isNumber ? (
        <label className="block" htmlFor={`${id}-v`}>
          <span className="text-small text-ink-2">
            {props.period} value, {m.unit}
            {m.cumulative ? ' (cumulative)' : ''}
          </span>
          <input
            id={`${id}-v`}
            value={draft.raw}
            onChange={(e) => props.onChange({ raw: e.target.value })}
            inputMode="decimal"
            autoComplete="off"
            aria-invalid={!!error}
            aria-describedby={`${id}-read ${id}-help ${id}-err ${id}-plaus`}
            className="mt-1 w-full border border-hairline bg-transparent px-3 py-2 text-medium text-ink"
          />
          {/* How the typed number was read, when "1 950" or "1.950" could be misread. */}
          <span id={`${id}-read`} className="mt-1 block text-small" aria-live="polite">
            {readingEcho(draft.raw, { integer: m.valueType === 'integer' })}
          </span>
        </label>
      ) : (
        <fieldset>
          <legend className="text-small text-ink-2">{props.period}</legend>
          <div className="mt-1 flex gap-2">
            {[true, false].map((b) => (
              <label key={String(b)} className={`flex h-9 cursor-pointer items-center border border-hairline px-3 text-small ${draft.bool === b ? 'bg-bg-alt text-ink-on-light' : ''}`}>
                <input type="radio" name={`${id}-b`} className="sr-only" checked={draft.bool === b} onChange={() => props.onChange({ bool: b })} />
                {b ? 'Yes' : 'No'}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <p id={`${id}-help`} className="text-small text-ink-2">
        {prev !== undefined && prev !== null && props.prefillFrom
          ? `Pre-filled from ${props.prefillFrom}: ${typeof prev === 'number' ? fmtNumber(prev, 2) : prev ? 'Yes' : 'No'}.`
          : 'No earlier value.'}
        {target !== undefined ? ` Target end of ${year}: ${fmtNumber(target, 2)}.` : ''}
        {props.prefillValue?.isEstimate ? ' Last value was an estimate.' : ''}
      </p>

      <p id={`${id}-err`} className="text-small text-status-off-track" role={error ? 'alert' : undefined}>
        {error}
      </p>

      {plausibility.message && (
        <p id={`${id}-plaus`} className="flex gap-2 border border-status-at-risk p-3 text-small" role="status">
          <span aria-hidden="true" className="text-status-at-risk">
            ▲
          </span>
          {plausibility.message}
        </p>
      )}

      <label className="flex items-center gap-2 text-small">
        <input type="checkbox" checked={draft.isEstimate} onChange={(e) => props.onChange({ isEstimate: e.target.checked })} className="h-4 w-4 accent-[var(--pulse-accent)]" />
        This is an estimate
      </label>

      {draft.showNote || noteRequired || draft.note || props.reviewNote || noteError ? (
        <label className="block">
          <span className="text-small text-ink-2">
            {props.reviewNote ? 'Your answer to the impact team' : noteRequired ? 'Note or evidence (needed for this change)' : 'Note or evidence (optional)'}
          </span>
          <textarea
            value={draft.note}
            onChange={(e) => props.onChange({ note: e.target.value })}
            rows={2}
            maxLength={280}
            aria-required={noteRequired}
            aria-invalid={!!noteError}
            aria-describedby={`${id}-note-err`}
            placeholder="e.g. First metered data replaces the modelled estimate."
            className="mt-1 w-full border border-hairline bg-transparent px-3 py-2 text-small text-ink placeholder:text-ink-2"
          />
          <span id={`${id}-note-err`} className="block text-small text-status-off-track" role={noteError ? 'alert' : undefined}>
            {noteError}
          </span>
        </label>
      ) : (
        <button type="button" className="self-start border-b border-ink-2 text-small text-ink-2" onClick={() => props.onChange({ showNote: true })}>
          Add a note or evidence
        </button>
      )}
    </section>
  );
}
