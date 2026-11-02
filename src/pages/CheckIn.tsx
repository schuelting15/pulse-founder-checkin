import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { KpiField, type FieldDraft } from '../components/KpiField';
import { DemoNotice, useDocumentTitle } from '../components/Layout';
import { Button, Chip, StatusBadge } from '../components/ui';
import { dueMetrics, prefill, previousPeriod, periodFor, upcomingAnnualCount } from '../lib/cadence';
import { COUNTRY_NAMES, CURRENT_QUARTER, MAX_REQUESTS_PER_CHECKIN, REQUEST_CATEGORIES, URGENCIES, categoryLabel, type CategoryId, type Urgency } from '../lib/config';
import { fmtDuration, fmtNumber, fmtSignedPct, parseNumberInput } from '../lib/format';
import { checkPlausibility } from '../lib/plausibility';
import { requestSchema, valueSchema } from '../lib/schema';
import { kpiStatus } from '../lib/status';
import type { Metric, Value } from '../lib/types';
import { asNumber, findValue, latestValue } from '../lib/values';
import { comparePeriods } from '../lib/period';
import { requestLabel, reviewLabel } from '../lib/labels';
import { newId, nowIso, useStore } from '../state/store';

type Step = 1 | 2 | 3;
type RequestDraft = { category: CategoryId | ''; text: string; urgency: Urgency | '' };
const EMPTY_REQUEST: RequestDraft = { category: '', text: '', urgency: '' };

function toDraft(v: Value | undefined, own: boolean): FieldDraft {
  const value = v?.value;
  return {
    raw: typeof value === 'number' ? fmtNumber(value, 2) : '',
    bool: typeof value === 'boolean' ? value : null,
    // Estimate flag and notes carry over only when editing this period's own value.
    isEstimate: own ? !!v?.isEstimate : false,
    note: own ? (v?.evidenceNote ?? v?.comment ?? '') : '',
    showNote: false,
  };
}

const parsedOf = (m: Metric, d: FieldDraft): number | boolean | null => (m.valueType === 'boolean' ? d.bool : parseNumberInput(d.raw, { integer: m.valueType === 'integer' }));

export default function CheckIn() {
  const { companyId = '' } = useParams();
  const { state, dispatch } = useStore();
  const company = state.companies.find((c) => c.id === companyId);
  useDocumentTitle(company ? `${company.name} check-in` : 'Check-in');

  const checkIn = state.checkIns.find((c) => c.companyId === companyId && c.quarter === CURRENT_QUARTER);
  const [editing, setEditing] = useState(!checkIn?.submittedAt);
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    if (company && editing && !checkIn) dispatch({ type: 'startCheckIn', companyId: company.id, at: nowIso() });
  }, [company, editing, checkIn, dispatch]);

  if (!company) {
    return (
      <section className="px-page py-block">
        <h1 className="text-medium">No company with that link</h1>
        <p className="mt-2 text-small text-ink-2">
          <Link to="/" className="border-b border-ink">
            Pick your company on the start page
          </Link>
          .
        </p>
      </section>
    );
  }

  return (
    <>
      <DemoNotice />
      <header className="border-b border-hairline px-page pb-cell pt-block">
        <p className="text-small text-ink-2">
          {company.stage} · {company.sector} · {COUNTRY_NAMES[company.country] ?? company.country}
        </p>
        <h1 className="mt-1 text-large">
          {company.name}: {CURRENT_QUARTER} check-in
        </h1>
        <p className="mt-3 max-w-3xl text-small text-ink-2">
          <span className="text-ink">Impact thesis.</span> {company.impactThesis}
        </p>
      </header>
      {editing ? (
        <CheckInForm
          key={checkIn?.submittedAt ?? 'new'}
          companyId={company.id}
          onSubmitted={() => {
            setEditing(false);
            setJustSubmitted(true);
            window.scrollTo(0, 0);
          }}
        />
      ) : (
        <Submitted companyId={company.id} justSubmitted={justSubmitted} onEdit={() => (setEditing(true), setJustSubmitted(false))} />
      )}
    </>
  );
}

function CheckInForm({ companyId, onSubmitted }: { companyId: string; onSubmitted: () => void }) {
  const { state, dispatch } = useStore();
  const due = useMemo(() => dueMetrics(state.metrics, companyId, CURRENT_QUARTER), [state.metrics, companyId]);
  const annualLater = upcomingAnnualCount(state.metrics, companyId, CURRENT_QUARTER);

  // Pre-fill every field once, from this period's own value if there is one, else from last period.
  const initial = useRef(
    Object.fromEntries(
      due.map((m) => {
        const p = prefill(state.values, m, companyId, CURRENT_QUARTER);
        return [m.id, { ...p, own: p.fromPeriod === periodFor(m, CURRENT_QUARTER) }];
      }),
    ),
  ).current;
  const [drafts, setDrafts] = useState<Record<string, FieldDraft>>(() => Object.fromEntries(due.map((m) => [m.id, toDraft(initial[m.id].value, initial[m.id].own)])));
  const [requests, setRequests] = useState<RequestDraft[]>([{ ...EMPTY_REQUEST }]);
  const [step, setStep] = useState<Step>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => heading.current?.focus(), [step]);

  const rows = due.map((m) => {
    const period = periodFor(m, CURRENT_QUARTER);
    const d = drafts[m.id];
    const parsed = parsedOf(m, d);
    const prevPeriod = previousPeriod(m, period);
    const prevValue = findValue(state.values, m.id, companyId, prevPeriod) ?? latestValue(state.values, m.id, companyId, (v) => comparePeriods(v.period, period) < 0);
    const prevNum = asNumber(prevValue);
    const num = typeof parsed === 'number' && !Number.isNaN(parsed) ? parsed : null;
    const plaus = m.valueType === 'boolean' ? checkPlausibility({ previous: null, next: null }) : checkPlausibility({ previous: prevNum, next: num, previousPeriod: prevValue?.period, cumulative: m.cumulative });
    const status = m.kind === 'impact_kpi' && m.cadence === 'quarterly' ? kpiStatus(m, companyId, CURRENT_QUARTER, state.values, num) : undefined;
    const pre = initial[m.id];
    const preVal = pre.value?.value ?? null;
    const changed = parsed !== preVal && !(typeof parsed === 'number' && typeof preVal === 'number' && Math.abs(parsed - preVal) < 1e-9);
    const own = findValue(state.values, m.id, companyId, period);
    return { m, period, d, parsed, num, prevValue, plaus, status, pre, changed, own };
  });

  const reviewRows = rows.map((r) => {
    const pre = r.pre.value?.value;
    return {
      r,
      pre: typeof pre === 'number' ? fmtNumber(pre, 2) : pre === undefined || pre === null ? '–' : pre ? 'Yes' : 'No',
      now: r.num !== null ? `${fmtNumber(r.num, 2)} ${r.m.unit}` : typeof r.parsed === 'boolean' ? (r.parsed ? 'Yes' : 'No') : '–',
      change: r.plaus.change !== null ? fmtSignedPct(r.plaus.change) : r.changed ? 'Changed' : 'Confirmed',
      notes: [r.d.isEstimate ? 'Estimate' : '', r.d.note].filter(Boolean).join(' · '),
    };
  });

  function validateNumbers(): boolean {
    const errs: Record<string, string> = {};
    for (const r of rows) {
      const result = valueSchema(r.m).safeParse(r.m.valueType === 'boolean' ? (r.parsed ?? undefined) : r.num === null ? (r.d.raw.trim() ? Number.NaN : undefined) : r.num);
      if (!result.success) errs[r.m.id] = result.error.issues[0].message;
      // Note errors sit at the note and take the focus there, where the fix happens.
      else if (r.plaus.needsNote && !r.d.note.trim()) errs[`${r.m.id}:note`] = 'Add a short note or evidence for this change.';
      else if (r.own?.status === 'queried' && !r.d.note.trim()) errs[`${r.m.id}:note`] = "Answer the impact team's question in the note.";
    }
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) {
      const [field, part] = first.split(':');
      document.querySelector<HTMLElement>(`[data-field="${field}"] ${part === 'note' ? 'textarea' : 'input'}`)?.focus();
    }
    return !first;
  }

  const filledRequests = requests.filter((r) => r.category || r.text.trim() || r.urgency);
  function validateRequests(): boolean {
    const errs: Record<string, string> = {};
    filledRequests.forEach((r) => {
      const res = requestSchema.safeParse(r);
      if (!res.success) errs[`req${requests.indexOf(r)}`] = res.error.issues.map((i) => i.message).join(' ');
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function submit() {
    const at = nowIso();
    dispatch({
      type: 'submitCheckIn',
      companyId,
      at,
      entries: rows.map((r) => ({
        metricId: r.m.id,
        period: r.period,
        value: r.m.valueType === 'boolean' ? (r.parsed as boolean | null) : r.num,
        previous: r.pre.value?.value ?? null,
        isEstimate: r.d.isEstimate,
        evidenceNote: r.d.note.trim() || undefined,
        prefilled: r.pre.value !== undefined,
        changed: r.changed,
      })),
      requests: filledRequests.map((r) => ({ id: newId('req'), category: r.category as CategoryId, text: r.text.trim(), urgency: r.urgency as Urgency })),
    });
    onSubmitted();
  }

  const steps: [Step, string][] = [
    [1, 'Impact numbers'],
    [2, 'What would help'],
    [3, 'Review and submit'],
  ];

  return (
    <div>
      <ol className="flex flex-wrap border-b border-hairline px-page text-small" aria-label="Steps">
        {steps.map(([n, label]) => (
          <li key={n} aria-current={step === n ? 'step' : undefined} className={`py-3 pr-6 ${step === n ? 'text-ink' : 'text-ink-2'}`}>
            {n}. {label}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <section aria-labelledby="step1">
          <div className="px-page pb-cell pt-block">
            <h2 id="step1" ref={heading} tabIndex={-1} className="text-medium outline-none">
              Your impact numbers for {CURRENT_QUARTER}
            </h2>
            <p className="mt-2 text-small text-ink-2">
              {rows.length} {rows.length === 1 ? 'field is' : 'fields are'} due this quarter, each pre-filled from last time. Change what moved; confirm the rest.
              {annualLater > 0 && ` Your Q4 check-in adds ${annualLater} annual fields, pre-filled from last year.`}
            </p>
          </div>
          <div className="grid border-l border-t border-hairline md:grid-cols-2 xl:grid-cols-3">
            {rows.map((r) => (
              <div key={r.m.id} data-field={r.m.id} className="contents">
                <KpiField
                  metric={r.m}
                  companyId={companyId}
                  quarter={CURRENT_QUARTER}
                  period={r.period}
                  values={state.values}
                  draft={r.d}
                  parsed={r.num}
                  status={r.status}
                  plausibility={r.plaus}
                  prefillFrom={r.pre.fromPeriod}
                  prefillValue={r.pre.value}
                  reviewNote={r.own?.status === 'queried' ? r.own.reviewNote : undefined}
                  error={errors[r.m.id]}
                  noteError={errors[`${r.m.id}:note`]}
                  onChange={(patch) => setDrafts((ds) => ({ ...ds, [r.m.id]: { ...ds[r.m.id], ...patch } }))}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end px-page pt-cell">
            <Button size="large" icon="→" onClick={() => validateNumbers() && setStep(2)}>
              Continue
            </Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="step2" className="px-page">
          <h2 id="step2" ref={heading} tabIndex={-1} className="pt-block text-medium outline-none">
            What would help most this quarter?
          </h2>
          <p className="mt-2 max-w-2xl text-small text-ink-2">
            Up to {MAX_REQUESTS_PER_CHECKIN} requests. The platform team suggests a Venture Partner, corporate partner or portfolio founder for each. Leave it empty if nothing comes to mind.
          </p>
          <div className="mt-6 space-y-6">
            {requests.map((r, i) => (
              <RequestFields
                key={i}
                index={i}
                value={r}
                error={errors[`req${i}`]}
                onChange={(patch) => setRequests((rs) => rs.map((x, j) => (j === i ? { ...x, ...patch } : x)))}
                onRemove={() => setRequests((rs) => rs.filter((_, j) => j !== i))}
              />
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-3">
              {requests.length < MAX_REQUESTS_PER_CHECKIN && (
                <Button variant="secondary" onClick={() => setRequests((rs) => [...rs, { ...EMPTY_REQUEST }])}>
                  {requests.length ? 'Add another request' : 'Add a request'}
                </Button>
              )}
              <button type="button" className="border-b border-ink-2 text-small text-ink-2" onClick={() => setStep(1)}>
                Back
              </button>
            </div>
            <Button size="large" icon="→" onClick={() => validateRequests() && setStep(3)}>
              {filledRequests.length ? 'Continue' : 'Continue without a request'}
            </Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section aria-labelledby="step3" className="px-page">
          <h2 id="step3" ref={heading} tabIndex={-1} className="pt-block text-medium outline-none">
            Review and submit
          </h2>
          {/* Phones get one block per field: the six-column table needs 640px and clipped the status. */}
          <ul className="mt-6 border-t border-hairline text-small md:hidden" aria-label="Values you are submitting">
            {reviewRows.map((x) => (
              <li key={x.r.m.id} className="border-b border-hairline py-3">
                <div className="flex items-start justify-between gap-3">
                  <p>{x.r.m.label}</p>
                  {x.r.status && <StatusBadge status={x.r.status.status} />}
                </div>
                <p className="mt-1">
                  <span className="text-medium">{x.now}</span>
                  <span className="text-ink-2">
                    {' '}
                    · {x.change} · pre-filled {x.pre}
                  </span>
                </p>
                {x.notes && <p className="mt-1 text-ink-2">{x.notes}</p>}
              </li>
            ))}
          </ul>
          <div className="relative mt-6 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[40rem] text-left text-small">
              <caption className="sr-only">Values you are submitting</caption>
              <thead className="text-ink-2">
                <tr className="border-b border-hairline">
                  <th scope="col" className="py-2 font-normal">Field</th>
                  <th scope="col" className="py-2 font-normal">Pre-filled</th>
                  <th scope="col" className="py-2 font-normal">{CURRENT_QUARTER}</th>
                  <th scope="col" className="py-2 font-normal">Change</th>
                  <th scope="col" className="py-2 font-normal">Status</th>
                  <th scope="col" className="py-2 font-normal">Notes</th>
                </tr>
              </thead>
              <tbody>
                {reviewRows.map((x) => (
                  <tr key={x.r.m.id} className="border-b border-hairline align-top">
                    <th scope="row" className="py-3 pr-4 font-normal">
                      {x.r.m.label}
                    </th>
                    <td className="py-3 pr-4 text-ink-2">{x.pre}</td>
                    <td className="py-3 pr-4">{x.now}</td>
                    <td className="py-3 pr-4">{x.change}</td>
                    <td className="py-3 pr-4">{x.r.status ? <StatusBadge status={x.r.status.status} /> : '–'}</td>
                    <td className="py-3 text-ink-2">{x.notes || '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="mt-block text-small">Requests</h3>
          {filledRequests.length ? (
            <ul className="mt-2 space-y-2 text-small">
              {filledRequests.map((r, i) => (
                <li key={i} className="border-b border-hairline pb-2">
                  <span className="text-ink-2">{categoryLabel(r.category)} · {r.urgency}: </span>
                  {r.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-small text-ink-2">No request this quarter.</p>
          )}
          <div className="mt-block flex flex-wrap items-center justify-between gap-3">
            <button type="button" className="border-b border-ink-2 text-small text-ink-2" onClick={() => setStep(2)}>
              Back
            </button>
            <Button size="large" onClick={submit}>
              Submit check-in
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function RequestFields({ index, value, error, onChange, onRemove }: { index: number; value: RequestDraft; error?: string; onChange: (p: Partial<RequestDraft>) => void; onRemove: () => void }) {
  return (
    <fieldset className="border border-hairline p-cell">
      <legend className="px-1 text-small">Request {index + 1}</legend>
      <p id={`cat-${index}`} className="text-small text-ink-2">
        Category
      </p>
      <div role="radiogroup" aria-labelledby={`cat-${index}`} className="mt-1 flex flex-wrap">
        {REQUEST_CATEGORIES.map((c) => (
          <Chip key={c.id} selected={value.category === c.id} onClick={() => onChange({ category: c.id })}>
            {c.label}
          </Chip>
        ))}
      </div>
      <label className="mt-4 block">
        <span className="text-small text-ink-2">In one or two sentences</span>
        <textarea
          value={value.text}
          onChange={(e) => onChange({ text: e.target.value })}
          rows={2}
          maxLength={280}
          placeholder="e.g. Hiring our first US sales lead"
          className="mt-1 w-full border border-hairline bg-transparent px-3 py-2 text-small text-ink placeholder:text-ink-2"
        />
      </label>
      <p id={`urg-${index}`} className="mt-4 text-small text-ink-2">
        When do you need it?
      </p>
      <div role="radiogroup" aria-labelledby={`urg-${index}`} className="mt-1 flex flex-wrap">
        {URGENCIES.map((u) => (
          <Chip key={u} selected={value.urgency === u} onClick={() => onChange({ urgency: u })}>
            {u}
          </Chip>
        ))}
      </div>
      {error && (
        <p className="mt-3 text-small text-status-off-track" role="alert">
          {error}
        </p>
      )}
      <button type="button" onClick={onRemove} className="mt-4 border-b border-ink-2 text-small text-ink-2">
        Remove this request
      </button>
    </fieldset>
  );
}

function Submitted({ companyId, justSubmitted, onEdit }: { companyId: string; justSubmitted: boolean; onEdit: () => void }) {
  const { state } = useStore();
  const ci = state.checkIns.find((c) => c.companyId === companyId && c.quarter === CURRENT_QUARTER)!;
  const due = dueMetrics(state.metrics, companyId, CURRENT_QUARTER);
  const annualLater = upcomingAnnualCount(state.metrics, companyId, CURRENT_QUARTER);
  const duration = ci.submittedAt ? Date.parse(ci.submittedAt) - Date.parse(ci.startedAt) : 0;
  const queried = due.map((m) => findValue(state.values, m.id, companyId, periodFor(m, CURRENT_QUARTER))).filter((v) => v?.status === 'queried');
  const myRequests = state.requests.filter((r) => r.companyId === companyId && r.quarter === CURRENT_QUARTER);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  return (
    <section className="px-page" aria-labelledby="done">
      <h2 id="done" ref={heading} tabIndex={-1} className="pt-block text-medium outline-none">
        {justSubmitted ? 'Thank you. Your check-in is in.' : `Your ${CURRENT_QUARTER} check-in is in.`}
      </h2>
      <p className="mt-3 text-medium" data-testid="checkin-summary">
        Done in {fmtDuration(duration)} · {ci.fieldsPrefilled} of {ci.fieldsShown} fields pre-filled · {ci.fieldsChanged ?? 0} updated
      </p>
      {annualLater > 0 && <p className="mt-2 text-small text-ink-2">{annualLater} annual fields are not due until your Q4 check-in, and will be pre-filled from last year.</p>}
      <p className="mt-6 max-w-2xl text-small text-ink-2">
        What happens next: the impact team reviews your numbers and may ask about one. The platform team looks at your requests and drafts an intro, which goes out only once both sides say yes.
      </p>

      {queried.length > 0 && (
        <div className="mt-block border border-status-at-risk p-cell">
          <h3 className="text-small">The impact team has a question</h3>
          {queried.map((v) => (
            <p key={v!.metricId} className="mt-2 text-small">
              <span className="text-ink-2">{state.metrics.find((m) => m.id === v!.metricId)?.label}: </span>
              {v!.reviewNote}
            </p>
          ))}
          <div className="mt-3">
            <Button onClick={onEdit}>Answer in the check-in</Button>
          </div>
        </div>
      )}

      <div className="mt-block grid border-l border-t border-hairline md:grid-cols-3">
        {due.map((m) => {
          const v = findValue(state.values, m.id, companyId, periodFor(m, CURRENT_QUARTER));
          const st = m.kind === 'impact_kpi' ? kpiStatus(m, companyId, CURRENT_QUARTER, state.values) : undefined;
          return (
            <div key={m.id} className="cell">
              <p className="text-small text-ink-2">{m.label}</p>
              <p className="mt-2 text-medium">{typeof v?.value === 'number' ? `${fmtNumber(v.value, 2)} ${m.unit}` : '–'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {st && <StatusBadge status={st.status} />}
                <span className="border border-hairline px-2 pb-0.5 pt-1 text-small text-ink-2">{v ? reviewLabel(v.status) : 'Not submitted'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {myRequests.length > 0 && (
        <>
          <h3 className="mt-block text-small">Your requests this quarter</h3>
          <ul className="mt-2 space-y-2 text-small">
            {myRequests.map((r) => (
              <li key={r.id} className="border-b border-hairline pb-2">
                <span className="text-ink-2">{categoryLabel(r.category)}: </span>
                {r.text} <span className="text-ink-2">· {requestLabel(r.status)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-block flex flex-wrap gap-3">
        <Button onClick={onEdit}>Update numbers</Button>
        <Link to="/" className="self-center border-b border-ink text-small">
          Back to start
        </Link>
      </div>
    </section>
  );
}

