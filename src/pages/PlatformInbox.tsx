import { useState } from 'react';
import { CopyButton } from '../components/CopyButton';
import { Drawer } from '../components/Drawer';
import { useDocumentTitle } from '../components/Layout';
import { Button, Chip, NumberCell, SectionHeader } from '../components/ui';
import { COUNTRY_NAMES, CURRENT_QUARTER, categoryLabel, categoryNoun } from '../lib/config';
import { daysBetween, fmtDate, fmtNumber, fmtPct, median } from '../lib/format';
import { introDrafts, type Counterpart, type Draft } from '../lib/intro';
import { requestLabel } from '../lib/labels';
import { matchHelpers, matchPeers, peerDinners, type MatchContext, type PeerDinner } from '../lib/match';
import type { DemoState, HelpRequest } from '../lib/types';
import { nowIso, useStore } from '../state/store';

type Filter = 'open' | 'resolved' | 'all';

const ctxOf = (s: DemoState): MatchContext => ({ companies: s.companies, helpers: s.helpers, requests: s.requests, quarter: CURRENT_QUARTER });

function Reasons({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Why this match">
      {items.map((r) => (
        <li key={r} className="border border-hairline px-2 pb-0.5 pt-1 text-small">
          {r}
        </li>
      ))}
    </ul>
  );
}

export default function PlatformInbox() {
  useDocumentTitle('Platform inbox');
  const { state } = useStore();
  const [filter, setFilter] = useState<Filter>('open');
  const [open, setOpen] = useState<string | null>(null);
  const ctx = ctxOf(state);
  const dinners = peerDinners(ctx);

  // Outcomes, not activity.
  const introDays = state.requests.filter((r) => r.introSentAt).map((r) => daysBetween(r.createdAt, r.introSentAt!));
  const resolved = state.requests.filter((r) => r.status === 'resolved');
  const rated = resolved.filter((r) => r.rating);
  const medianDays = median(introDays);
  const avgRating = rated.length ? rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length : null;

  const rows = state.requests
    .filter((r) => (filter === 'all' ? true : filter === 'open' ? r.status !== 'resolved' : r.status === 'resolved'))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const company = (id: string) => state.companies.find((c) => c.id === id)!;

  return (
    <>
      <div className="border-b border-hairline">
        <SectionHeader level={1} title="Platform inbox" subtitle={`Help requests from ${CURRENT_QUARTER} check-ins, with suggested matches and the reasons for each.`} />
      </div>

      {dinners.map((d) => (
        <PeerDinnerCard key={d.category} dinner={d} />
      ))}

      <section aria-label="Outcomes" className="grid border-b border-hairline sm:grid-cols-3">
        <NumberCell label="Median days to intro" value={medianDays === null ? '–' : fmtNumber(medianDays, 1)} caption="From request to intro sent" minHeight="min-h-[9rem]" />
        <NumberCell label="Requests resolved" value={state.requests.length ? fmtPct(resolved.length / state.requests.length) : '–'} caption={`${resolved.length} of ${state.requests.length} requests`} minHeight="min-h-[9rem]" />
        <NumberCell label="Average founder rating" value={avgRating === null ? '–' : `${fmtNumber(avgRating, 1)} / 5`} caption={`${rated.length} rated intros`} minHeight="min-h-[9rem]" />
      </section>

      <section aria-labelledby="requests-h">
        <SectionHeader id="requests-h" title="Requests" subtitle="Newest first. Open a request to see matches and draft a double opt-in intro." />
        <div className="flex flex-wrap px-page pb-cell" role="group" aria-label="Filter requests">
          {(['open', 'resolved', 'all'] as Filter[]).map((f) => (
            <Chip key={f} selected={filter === f} onClick={() => setFilter(f)}>
              {{ open: 'Open', resolved: 'Resolved', all: 'All' }[f]} ({f === 'all' ? state.requests.length : f === 'open' ? state.requests.length - resolved.length : resolved.length})
            </Chip>
          ))}
        </div>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[56rem] text-left text-small">
            <thead className="text-ink-2">
              <tr className="border-b border-t border-hairline">
                <th scope="col" className="py-2 pl-[var(--pulse-gutter)] font-normal">Company</th>
                <th scope="col" className="py-2 font-normal">Request</th>
                <th scope="col" className="py-2 font-normal">Urgency</th>
                <th scope="col" className="py-2 font-normal">Status</th>
                <th scope="col" className="py-2 font-normal">Created</th>
                <th scope="col" className="py-2 pr-[var(--pulse-gutter)]"><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const c = company(r.companyId);
                return (
                  <tr key={r.id} className="border-b border-hairline align-top" data-testid={`request-${r.id}`}>
                    <th scope="row" className="py-3 pl-[var(--pulse-gutter)] pr-4 font-normal">
                      {c.name}
                      <span className="block text-ink-2">{c.stage}</span>
                    </th>
                    <td className="max-w-[28rem] py-3 pr-4">
                      <span className="text-ink-2">{categoryLabel(r.category)}</span>
                      <span className="block">{r.text}</span>
                    </td>
                    <td className="py-3 pr-4">{r.urgency}</td>
                    <td className="py-3 pr-4">
                      {requestLabel(r.status)}
                      {r.rating ? ` · ${r.rating}/5` : ''}
                    </td>
                    <td className="py-3 pr-4">{fmtDate(r.createdAt)}</td>
                    <td className="py-3 pr-[var(--pulse-gutter)] text-right">
                      <Button icon="→" onClick={() => setOpen(r.id)} aria-label={`Open request from ${c.name}`}>
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

      {open && <RequestDrawer request={state.requests.find((r) => r.id === open)!} onClose={() => setOpen(null)} />}
    </>
  );
}

function PeerDinnerCard({ dinner: d }: { dinner: PeerDinner }) {
  const invite = [
    `Subject: Peer dinner: ${d.title}`,
    '',
    `${d.companies.length} founders in the portfolio asked about ${categoryNoun(d.category)} this quarter. We would like to bring you together for dinner${d.host ? `, hosted by ${d.host.helper.name}` : ''}.`,
    '',
    'Invited:',
    ...d.companies.map((c) => `- ${c.founder.name}, ${c.name}`),
    '',
    'Reply with the evenings that work for you in the next three weeks.',
    '',
    'Platform team',
  ].join('\n');
  return (
    <section className="grid border-b border-hairline lg:grid-cols-3" aria-labelledby={`dinner-${d.category}`} data-testid="peer-dinner">
      <div className="cell lg:col-span-1">
        <p className="text-small text-ink-2">Peer dinner suggestion</p>
        <h2 id={`dinner-${d.category}`} className="mt-1 text-medium">
          {d.title}
        </h2>
        <p className="mt-2 text-small text-ink-2">
          {d.companies.length} founders asked about {categoryNoun(d.category)} in {CURRENT_QUARTER}.
        </p>
        <div className="mt-4">
          <CopyButton text={invite} label="Copy invitation" />
        </div>
      </div>
      <div className="cell">
        <h3 className="text-small text-ink-2">Invite list</h3>
        <ul className="mt-2 space-y-1 text-small">
          {d.companies.map((c) => (
            <li key={c.id}>
              {c.founder.name} <span className="text-ink-2">· {c.name}, {c.stage}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="cell">
        <h3 className="text-small text-ink-2">Suggested host</h3>
        {d.host ? (
          <>
            <p className="mt-2 text-small">{d.host.helper.name}</p>
            <p className="text-small text-ink-2">{d.host.helper.title}</p>
            <Reasons items={d.host.reasons.slice(0, 4)} />
          </>
        ) : (
          <p className="mt-2 text-small text-ink-2">No Venture Partner has a free slot this quarter.</p>
        )}
      </div>
    </section>
  );
}

function DraftBlock({ step, title, draft }: { step: string; title: string; draft: Draft }) {
  const text = `To: ${draft.to}\nSubject: ${draft.subject}\n\n${draft.body}`;
  return (
    <div className="border border-hairline">
      <div className="flex items-center justify-between gap-3 border-b border-hairline p-3">
        <p className="text-small">
          <span className="text-ink-2">{step} · </span>
          {title}
        </p>
        <CopyButton text={text} />
      </div>
      <pre className="whitespace-pre-wrap p-3 font-sans text-small text-ink-2">{text}</pre>
    </div>
  );
}

function RequestDrawer({ request: r, onClose }: { request: HelpRequest; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const ctx = ctxOf(state);
  const c = state.companies.find((x) => x.id === r.companyId)!;
  const helpers = matchHelpers(r, ctx);
  const peers = matchPeers(r, ctx);
  const [selected, setSelected] = useState<{ kind: 'helper' | 'peer'; id: string } | null>(
    r.helperId ? { kind: 'helper', id: r.helperId } : r.peerCompanyId ? { kind: 'peer', id: r.peerCompanyId } : null,
  );
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);

  let counterpart: Counterpart | null = null;
  let reasons: string[] = [];
  if (selected?.kind === 'helper') {
    const h = state.helpers.find((x) => x.id === selected.id);
    if (h) {
      counterpart = { kind: 'helper', helper: h };
      reasons = (helpers.find((m) => m.helper.id === h.id)?.reasons ?? []).filter((x) => !x.includes('slots free'));
    }
  } else if (selected?.kind === 'peer') {
    const p = state.companies.find((x) => x.id === selected.id);
    if (p) {
      counterpart = { kind: 'peer', company: p };
      reasons = peers.find((m) => m.company.id === p.id)?.reasons ?? [];
    }
  }
  const drafts = counterpart ? introDrafts(r, c, counterpart, reasons) : null;
  const audit = state.audit.filter((e) => e.requestId === r.id);
  const locked = r.status !== 'new';

  return (
    <Drawer title={c.name} subtitle={`${categoryLabel(r.category)} · ${r.urgency} · ${requestLabel(r.status)}`} onClose={onClose}>
      <div className="space-y-block p-cell">
        <section>
          <p className="text-medium">“{r.text}”</p>
          <p className="mt-3 text-small text-ink-2">
            {c.founder.name} · {c.stage} · {c.sector} · {COUNTRY_NAMES[c.country] ?? c.country} · asked {fmtDate(r.createdAt)}
          </p>
          <p className="mt-2 text-small text-ink-2">{c.oneLiner}</p>
        </section>

        <section aria-labelledby="helpers-h">
          <h3 id="helpers-h" className="text-small">
            Suggested helpers
          </h3>
          <p className="text-small text-ink-2">
            {r.category === 'other' ? 'Outside the eight categories, so it goes to the team that triages it.' : `Top ${helpers.length} by score. Helpers at capacity are left out.`}
          </p>
          <ol className="mt-3 space-y-3">
            {helpers.map((m, i) => {
              const isSel = selected?.kind === 'helper' && selected.id === m.helper.id;
              return (
                <li key={m.helper.id} className={`border p-3 ${isSel ? 'border-ink' : 'border-hairline'}`} data-testid={`helper-${i}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-small">
                        {i + 1}. {m.helper.name}
                        <span className="text-ink-2"> · {m.helper.kind === 'venture_partner' ? 'Venture Partner' : m.helper.kind === 'corporate' ? 'Corporate partner' : 'Fund team'}</span>
                      </p>
                      <p className="text-small text-ink-2">{m.helper.title}</p>
                    </div>
                    <p className="text-small text-ink-2">Score {fmtNumber(m.score, 2)}</p>
                  </div>
                  <Reasons items={m.reasons} />
                  {!locked && (
                    <div className="mt-3">
                      <Chip selected={isSel} onClick={() => setSelected({ kind: 'helper', id: m.helper.id })}>
                        {isSel ? 'Selected' : 'Draft intro'}
                      </Chip>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="peers-h">
          <h3 id="peers-h" className="text-small">
            Portfolio founders who solved this
          </h3>
          {peers.length === 0 ? (
            <p className="text-small text-ink-2">
              {r.category === 'other'
                ? 'Peers are matched by category, so there are none for this request.'
                : `No founder in the portfolio has resolved a ${categoryNoun(r.category)} request with a rating of 4 or more yet.`}
            </p>
          ) : (
            <ol className="mt-3 space-y-3">
              {peers.map((p) => {
                const isSel = selected?.kind === 'peer' && selected.id === p.company.id;
                return (
                  <li key={p.company.id} className={`border p-3 ${isSel ? 'border-ink' : 'border-hairline'}`} data-testid="peer">
                    <p className="text-small">
                      {p.company.founder.name}
                      <span className="text-ink-2"> · {p.company.name}</span>
                    </p>
                    <Reasons items={p.reasons} />
                    {!locked && (
                      <div className="mt-3">
                        <Chip selected={isSel} onClick={() => setSelected({ kind: 'peer', id: p.company.id })}>
                          {isSel ? 'Selected' : 'Draft intro'}
                        </Chip>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {drafts && (
          <section aria-labelledby="drafts-h" className="space-y-3">
            <h3 id="drafts-h" className="text-small">
              Intro drafts (double opt-in). Pulse sends nothing; copy them into your email.
            </h3>
            <DraftBlock step="Step 1" title="Ask first" draft={drafts.ask} />
            <DraftBlock step="Step 2" title="Introduce both, once they say yes" draft={drafts.intro} />
          </section>
        )}

        <section aria-labelledby="status-h" className="border-t border-hairline pt-cell">
          <h3 id="status-h" className="text-small">
            Status: {requestLabel(r.status)}
            {r.rating ? `, rated ${r.rating}/5` : ''}
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {r.status === 'new' && (
              <Button
                disabled={!selected}
                onClick={() =>
                  selected &&
                  dispatch({ type: 'draftIntro', requestId: r.id, at: nowIso(), helperId: selected.kind === 'helper' ? selected.id : undefined, peerCompanyId: selected.kind === 'peer' ? selected.id : undefined })
                }
              >
                {selected ? 'Mark intro drafted' : 'Pick a match to draft an intro'}
              </Button>
            )}
            {r.status === 'intro_drafted' && <Button onClick={() => dispatch({ type: 'sendIntro', requestId: r.id, at: nowIso() })}>Mark intro sent</Button>}
            {r.status === 'intro_sent' && (
              <>
                <div role="radiogroup" aria-label="Founder rating" className="flex">
                  {([1, 2, 3, 4, 5] as const).map((n) => (
                    <Chip key={n} selected={rating === n} onClick={() => setRating(n)}>
                      {n}
                    </Chip>
                  ))}
                </div>
                <Button disabled={!rating} onClick={() => rating && dispatch({ type: 'resolveRequest', requestId: r.id, rating, at: nowIso() })}>
                  Mark resolved
                </Button>
              </>
            )}
          </div>
        </section>

        <section className="border-t border-hairline pt-cell">
          <h3 className="mb-2 text-small">History</h3>
          <ol className="space-y-2 text-small">
            {[...audit].reverse().map((e, i) => (
              <li key={i} className="border-b border-hairline pb-2">
                <span className="text-ink-2">{fmtDate(e.at)} · </span>
                {e.action}
                {e.to ? ` · ${state.helpers.find((h) => h.id === e.to)?.name ?? state.companies.find((x) => x.id === e.to)?.name ?? String(e.to)}` : ''}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Drawer>
  );
}
