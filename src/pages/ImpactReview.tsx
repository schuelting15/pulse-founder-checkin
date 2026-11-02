import { useMemo, useState } from 'react';
import { Drawer } from '../components/Drawer';
import { useDocumentTitle } from '../components/Layout';
import { LazySparkline as Sparkline } from '../components/LazySparkline';
import { Button, Chip, NumberCell, SectionHeader, StatusBadge, type Status } from '../components/ui';
import { achievementByFund, companyAchievement, type AggregateMode } from '../lib/aggregate';
import { previousPeriod } from '../lib/cadence';
import { kpiSeries } from '../lib/chart';
import { CURRENT_QUARTER } from '../lib/config';
import { exportCsv } from '../lib/csv';
import { fmtDate, fmtNumber, fmtPct, fmtSignedPct } from '../lib/format';
import { KPI_TYPE_LABEL, reviewLabel } from '../lib/labels';
import { comparePeriods, parseQuarter } from '../lib/period';
import { checkPlausibility, isCarriedForward } from '../lib/plausibility';
import { companyStatus, kpiStatus, statusKpis } from '../lib/status';
import type { Company, DemoState, Metric, Value } from '../lib/types';
import { asNumber, findValue } from '../lib/values';
import { nowIso, useStore } from '../state/store';

const { year: YEAR } = parseQuarter(CURRENT_QUARTER);

function download(csv: string, name: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const fmtValue = (v: Value | undefined, m: Metric) =>
  v === undefined || v.value === null ? '–' : typeof v.value === 'boolean' ? (v.value ? 'Yes' : 'No') : `${fmtNumber(v.value, 2)} ${m.unit}`;

export default function ImpactReview() {
  useDocumentTitle('Impact review');
  const { state } = useStore();
  const [openCompany, setOpenCompany] = useState<string | null>(null);
  const [history, setHistory] = useState<{ companyId: string; metricId: string } | null>(null);
  const [filter, setFilter] = useState<Status | 'all'>('all');

  const statuses = useMemo(() => Object.fromEntries(state.companies.map((c) => [c.id, companyStatus(state.metrics, state.values, c.id, CURRENT_QUARTER)])) as Record<string, Status>, [state]);
  const count = (s: Status) => Object.values(statuses).filter((x) => x === s).length;
  const received = state.checkIns.filter((c) => c.quarter === CURRENT_QUARTER && c.submittedAt).length;
  const byFund = (mode: AggregateMode) => achievementByFund(state.companies, state.metrics, state.values, mode);
  const lastYear = byFund({ kind: 'annual', year: YEAR - 1 });
  const thisYear = byFund({ kind: 'annual', year: YEAR });
  const longTerm = byFund({ kind: 'longTerm', upTo: CURRENT_QUARTER });
  const pct = (r: number | null) => (r === null ? '–' : fmtPct(r));
  const [mainFund, ...otherFunds] = lastYear;

  const queue = state.values
    .filter((v) => v.status === 'submitted')
    .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? '') || a.metricId.localeCompare(b.metricId));

  const companies = [...state.companies].sort((a, b) => a.name.localeCompare(b.name)).filter((c) => filter === 'all' || statuses[c.id] === filter);

  return (
    <>
      <div className="border-b border-hairline">
        <SectionHeader
          level={1}
          title="Impact review"
          subtitle={`${CURRENT_QUARTER} check-ins. Values count once the impact team accepts them.`}
          action={
            <Button icon="↗" onClick={() => download(exportCsv(state), `pulse-export-${CURRENT_QUARTER}.csv`)}>
              Export CSV
            </Button>
          }
        />
      </div>

      <section aria-label="Portfolio" className="grid border-b border-hairline sm:grid-cols-2 lg:grid-cols-4">
        <NumberCell label="Check-ins received" value={`${received} of ${state.companies.length}`} caption={CURRENT_QUARTER} minHeight="min-h-[10rem]" />
        <div className="cell flex min-h-[10rem] flex-col justify-between gap-4">
          <p className="text-small text-ink-2">Company status, {CURRENT_QUARTER}</p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
            {(['on_track', 'at_risk', 'off_track', 'missing'] as Status[]).map((s) => (
              <li key={s} className="flex items-center justify-between gap-2">
                <StatusBadge status={s} />
                <span className="text-medium">{count(s)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="cell flex min-h-[10rem] flex-col justify-between gap-4">
          <p className="text-small text-ink-2">Impact achieved vs {YEAR - 1} targets</p>
          <div>
            <p className="text-small text-ink-2">
              {mainFund.fund} · {mainFund.companiesIncluded} companies
            </p>
            <p className="text-large">{pct(mainFund.ratio)}</p>
            {otherFunds.map((f) => (
              <p key={f.fund} className="mt-2 flex items-baseline justify-between gap-4 text-small text-ink-2">
                <span>
                  {f.fund} · {f.companiesIncluded} companies
                </span>
                <span className="text-medium text-ink">{pct(f.ratio)}</span>
              </p>
            ))}
            <p className="mt-2 text-small text-ink-2">Actual ÷ target, capital-weighted per fund, as in the EIF Gamma Model.</p>
          </div>
        </div>
        <div className="cell flex min-h-[10rem] flex-col justify-between gap-4">
          <p className="text-small text-ink-2">Same measure, this year and long-term</p>
          <table className="w-full text-small">
            <thead className="text-ink-2">
              <tr>
                <th scope="col" className="pb-2 text-left font-normal">Fund</th>
                <th scope="col" className="pb-2 text-right font-normal">{YEAR} to date</th>
                <th scope="col" className="pb-2 text-right font-normal">Long-term</th>
              </tr>
            </thead>
            <tbody>
              {thisYear.map((f, i) => (
                <tr key={f.fund}>
                  <th scope="row" className="py-1 text-left font-normal text-ink-2">
                    {f.fund}
                  </th>
                  <td className="py-1 text-right text-medium">{pct(f.ratio)}</td>
                  <td className="py-1 text-right text-medium">{pct(longTerm[i].ratio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="queue-h">
        <SectionHeader id="queue-h" title={`Review queue (${queue.length})`} subtitle="Submitted values with plausibility and estimate flags. Accept, or query with a note back to the founder." />
        {queue.length === 0 ? (
          <p className="px-page text-small text-ink-2">Nothing waiting. Every submitted value has been reviewed.</p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-small">
              <thead className="text-ink-2">
                <tr className="border-b border-t border-hairline">
                  <th scope="col" className="py-2 pl-[var(--pulse-gutter)] font-normal">Company</th>
                  <th scope="col" className="py-2 font-normal">Field</th>
                  <th scope="col" className="py-2 font-normal">Value</th>
                  <th scope="col" className="py-2 font-normal">Flags and notes</th>
                  <th scope="col" className="py-2 pr-[var(--pulse-gutter)] text-right font-normal">Review</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((v) => (
                  <QueueRow key={`${v.companyId}-${v.metricId}-${v.period}`} value={v} state={state} onHistory={() => setHistory({ companyId: v.companyId, metricId: v.metricId })} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="companies-h">
        <SectionHeader id="companies-h" title="Companies" subtitle={`Status per impact KPI in ${CURRENT_QUARTER}. Open a company for actual vs target and the full history.`} />
        <div className="flex flex-wrap px-page pb-cell" role="group" aria-label="Filter by status">
          <Chip selected={filter === 'all'} onClick={() => setFilter('all')}>
            All
          </Chip>
          {(['on_track', 'at_risk', 'off_track', 'missing'] as Status[]).map((s) => (
            <Chip key={s} selected={filter === s} onClick={() => setFilter(s)}>
              {({ on_track: 'On track', at_risk: 'At risk', off_track: 'Off track', missing: 'Missing' } as const)[s]} ({count(s)})
            </Chip>
          ))}
        </div>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[56rem] text-left text-small">
            <thead className="text-ink-2">
              <tr className="border-b border-t border-hairline">
                <th scope="col" className="py-2 pl-[var(--pulse-gutter)] font-normal">Company</th>
                <th scope="col" className="py-2 font-normal">Check-in</th>
                <th scope="col" className="py-2 font-normal">Impact KPIs</th>
                <th scope="col" className="py-2 font-normal">vs {YEAR - 1} target</th>
                <th scope="col" className="py-2 pr-[var(--pulse-gutter)]"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => {
                const ci = state.checkIns.find((x) => x.companyId === c.id && x.quarter === CURRENT_QUARTER && x.submittedAt);
                const ach = companyAchievement(c, state.metrics, state.values, { kind: 'annual', year: YEAR - 1 }).ratio;
                return (
                  <tr key={c.id} className="border-b border-hairline align-top">
                    <th scope="row" className="py-3 pl-[var(--pulse-gutter)] pr-4 font-normal">
                      {c.name}
                      <span className="block text-ink-2">
                        {c.stage} · {c.fund}
                      </span>
                    </th>
                    <td className="py-3 pr-4">{ci ? `Submitted ${fmtDate(ci.submittedAt!)}` : <span className="text-ink-2">Not yet</span>}</td>
                    <td className="py-3 pr-4">
                      <ul className="space-y-1">
                        {statusKpis(state.metrics, c.id).map((m) => (
                          <li key={m.id} className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={kpiStatus(m, c.id, CURRENT_QUARTER, state.values).status} />
                            <span>{m.label}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-3 pr-4">{ach === null ? '–' : fmtPct(ach)}</td>
                    <td className="py-3 pr-[var(--pulse-gutter)] text-right">
                      <Button icon="→" onClick={() => setOpenCompany(c.id)} aria-label={`Open ${c.name}`}>
                        Open
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {openCompany && <CompanyDrawer company={state.companies.find((c) => c.id === openCompany)!} state={state} onClose={() => setOpenCompany(null)} />}
      {history && <HistoryDrawer {...history} state={state} onClose={() => setHistory(null)} />}
    </>
  );
}

function QueueRow({ value: v, state, onHistory }: { value: Value; state: DemoState; onHistory: () => void }) {
  const { dispatch } = useStore();
  const [querying, setQuerying] = useState(false);
  const [note, setNote] = useState('');
  const c = state.companies.find((x) => x.id === v.companyId)!;
  const m = state.metrics.find((x) => x.id === v.metricId)!;
  const prev = findValue(state.values, m.id, c.id, previousPeriod(m, v.period));
  const plaus = typeof v.value === 'number' ? checkPlausibility({ previous: asNumber(prev), next: v.value, previousPeriod: prev?.period, cumulative: m.cumulative }) : null;
  const carried = typeof v.value === 'number' && isCarriedForward({ previous: asNumber(prev), next: v.value, cumulative: m.cumulative, quarterly: m.cadence === 'quarterly' });
  const key = { companyId: c.id, metricId: m.id, period: v.period };
  const label = `${c.name}, ${m.label}`;

  return (
    <tr className="border-b border-hairline align-top" data-testid={`queue-${m.id}`}>
      <th scope="row" className="py-3 pl-[var(--pulse-gutter)] pr-4 font-normal">
        {c.name}
        <span className="block text-ink-2">Submitted {v.submittedAt ? fmtDate(v.submittedAt) : '–'}</span>
      </th>
      <td className="py-3 pr-4">
        {m.label}
        <span className="block text-ink-2">
          {v.period}
          {m.paiIndicator ? ` · PAI ${m.paiIndicator}` : ''}
        </span>
      </td>
      <td className="py-3 pr-4">
        <span className="text-medium">{fmtValue(v, m)}</span>
        {prev && (
          <span className="block text-ink-2">
            {prev.period}: {fmtValue(prev, m)}
            {plaus?.change !== null && plaus?.change !== undefined ? ` · ${fmtSignedPct(plaus.change)}` : ''}
          </span>
        )}
      </td>
      <td className="max-w-[22rem] py-3 pr-4">
        <div className="flex flex-wrap gap-2">
          {plaus?.needsNote && (
            <span className="inline-flex items-center gap-1 border border-status-at-risk px-2 pb-0.5 pt-1">
              <span aria-hidden="true" className="text-status-at-risk">
                ▲
              </span>
              {plaus.reason === 'decrease' ? 'Cumulative value went down' : `Jump ${fmtSignedPct(plaus.change ?? 0)}`}
            </span>
          )}
          {carried && <span className="border border-hairline px-2 pb-0.5 pt-1">Same as {prev?.period}</span>}
          {v.isEstimate && <span className="border border-hairline px-2 pb-0.5 pt-1">Estimate</span>}
        </div>
        {(v.evidenceNote || v.comment) && <p className="mt-2 text-ink-2">“{v.evidenceNote ?? v.comment}”</p>}
        {!plaus?.needsNote && !carried && !v.isEstimate && !v.evidenceNote && !v.comment && <span className="text-ink-2">None</span>}
      </td>
      <td className="py-3 pr-[var(--pulse-gutter)] text-right">
        {querying ? (
          <form
            className="ml-auto flex max-w-xs flex-col items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!note.trim()) return;
              dispatch({ type: 'queryValue', ...key, at: nowIso(), note: note.trim() });
            }}
          >
            <label className="w-full text-left">
              <span className="text-ink-2">Question for the founder</span>
              <textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} rows={2} required className="mt-1 w-full border border-hairline bg-transparent px-2 py-1 text-ink" />
            </label>
            <div className="flex gap-2">
              <button type="button" className="border-b border-ink-2 text-ink-2" onClick={() => setQuerying(false)}>
                Cancel
              </button>
              <Button type="submit">Send query</Button>
            </div>
          </form>
        ) : (
          <div className="flex justify-end gap-2">
            <button type="button" className="border-b border-ink-2 text-ink-2" onClick={onHistory} aria-label={`History: ${label}`}>
              History
            </button>
            <button type="button" className="h-9 border border-hairline px-3" onClick={() => setQuerying(true)} aria-label={`Query ${label}`}>
              Query
            </button>
            <Button onClick={() => dispatch({ type: 'acceptValue', ...key, at: nowIso() })} aria-label={`Accept ${label}`}>
              Accept
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}

const ACTOR: Record<string, string> = { founder: 'Founder', impact_team: 'Impact team', platform_team: 'Platform team' };
const show = (x: unknown) => (typeof x === 'number' ? fmtNumber(x, 2) : typeof x === 'boolean' ? (x ? 'Yes' : 'No') : x === null ? '–' : String(x));

function AuditList({ entries, metrics }: { entries: DemoState['audit']; metrics: Metric[] }) {
  return (
    <ol className="space-y-2 text-small">
      {[...entries].reverse().map((e, i) => (
        <li key={i} className="border-b border-hairline pb-2">
          <span className="text-ink-2">{fmtDate(e.at)} · {ACTOR[e.actor]} · </span>
          {e.action}
          {e.metricId && metrics.length > 1 ? ` · ${metrics.find((m) => m.id === e.metricId)?.label ?? ''}` : ''}
          {e.from !== undefined && e.to !== undefined && e.from !== e.to ? ` · ${show(e.from)} → ${show(e.to)}` : e.to !== undefined && e.from === undefined ? ` · ${show(e.to)}` : ''}
          {e.note && <span className="block text-ink-2">“{e.note}”</span>}
        </li>
      ))}
    </ol>
  );
}

function HistoryDrawer({ companyId, metricId, state, onClose }: { companyId: string; metricId: string; state: DemoState; onClose: () => void }) {
  const c = state.companies.find((x) => x.id === companyId)!;
  const m = state.metrics.find((x) => x.id === metricId)!;
  const vals = state.values.filter((v) => v.companyId === companyId && v.metricId === metricId).sort((a, b) => comparePeriods(b.period, a.period));
  const audit = state.audit.filter((e) => e.companyId === companyId && e.metricId === metricId);
  return (
    <Drawer title={m.label} subtitle={`${c.name} · ${m.unit}`} onClose={onClose}>
      <div className="space-y-block p-cell">
        <p className="text-small text-ink-2">{m.definition}</p>
        <table className="w-full text-left text-small">
          <caption className="sr-only">Values by period</caption>
          <thead className="text-ink-2">
            <tr className="border-b border-hairline">
              <th scope="col" className="py-2 font-normal">Period</th>
              <th scope="col" className="py-2 font-normal">Value</th>
              <th scope="col" className="py-2 font-normal">Review</th>
            </tr>
          </thead>
          <tbody>
            {vals.map((v) => (
              <tr key={v.period} className="border-b border-hairline">
                <td className="py-2">{v.period}</td>
                <td className="py-2">
                  {fmtValue(v, m)}
                  {v.isEstimate ? ' · estimate' : ''}
                </td>
                <td className="py-2">{reviewLabel(v.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div>
          <h3 className="mb-2 text-small">History</h3>
          <AuditList entries={audit} metrics={[m]} />
        </div>
      </div>
    </Drawer>
  );
}

function CompanyDrawer({ company: c, state, onClose }: { company: Company; state: DemoState; onClose: () => void }) {
  const kpis = state.metrics.filter((m) => m.companyId === c.id);
  const audit = state.audit.filter((e) => e.companyId === c.id && e.metricId).slice(-12);
  return (
    <Drawer title={c.name} subtitle={`${c.stage} · ${c.sector} · ${c.fund} · SDG ${c.sdgs.join(', ')}`} onClose={onClose}>
      <div className="space-y-block p-cell">
        <p className="text-small">
          <span className="text-ink-2">Impact thesis. </span>
          {c.impactThesis}
        </p>
        {kpis.map((m) => {
          const st = kpiStatus(m, c.id, CURRENT_QUARTER, state.values);
          return (
            <section key={m.id} aria-label={m.label} className="border-t border-hairline pt-cell">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-small text-ink-2">
                    {KPI_TYPE_LABEL[m.kpiType ?? 'attributable_impact']} · weight {fmtPct(m.weight ?? 0)}
                  </p>
                  <h3 className="text-medium">{m.label}</h3>
                </div>
                <StatusBadge status={st.status} />
              </div>
              <div className="mt-3">
                <Sparkline data={kpiSeries(m, c.id, state.values, CURRENT_QUARTER)} unit={m.unit} height={180} axes />
                <p className="text-tiny text-ink-2">
                  Blue: actual ({m.unit}). Dashed: straight path from end-{YEAR - 1} to the end-{YEAR} target of {m.annualTargets?.[YEAR] !== undefined ? fmtNumber(m.annualTargets[YEAR], 2) : '–'}.
                  {m.longTermTarget !== undefined ? ` Long-term target: ${fmtNumber(m.longTermTarget)} by ${m.longTermTargetYear}.` : ''}
                </p>
              </div>
            </section>
          );
        })}
        <section className="border-t border-hairline pt-cell">
          <h3 className="mb-2 text-small">Recent history</h3>
          <AuditList entries={audit} metrics={kpis} />
        </section>
      </div>
    </Drawer>
  );
}
