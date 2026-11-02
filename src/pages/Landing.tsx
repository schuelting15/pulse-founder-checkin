import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '../components/Layout';
import { Button, LinkArrow, NumberCell } from '../components/ui';
import { DEMO_COMPANY_ID } from '../data/seed';
import { CURRENT_QUARTER } from '../lib/config';
import { fmtDuration, fmtPct, median } from '../lib/format';
import { useStore } from '../state/store';

export function Landing() {
  useDocumentTitle('');
  const { state } = useStore();
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState(DEMO_COMPANY_ID);

  // The success metric, stated up front: founder time and the share pre-filled.
  const done = state.checkIns.filter((c) => c.quarter === CURRENT_QUARTER && c.submittedAt);
  const minutes = median(done.map((c) => Date.parse(c.submittedAt!) - Date.parse(c.startedAt)));
  const shown = done.reduce((s, c) => s + c.fieldsShown, 0);
  const prefilled = done.reduce((s, c) => s + c.fieldsPrefilled, 0);

  return (
    <>
      <section className="grid border-b border-hairline lg:grid-cols-3">
        <div className="px-page pb-block pt-block lg:col-span-2 lg:pt-hero">
          <h1 className="text-display">Pulse</h1>
          <p className="mt-6 max-w-2xl text-medium">One quarterly check-in. Two answers.</p>
          <div className="mt-6 max-w-2xl space-y-3 text-small text-ink-2">
            <p>
              Founders already report impact data to their investors. Pulse turns that reporting into one short check-in. Founders confirm or update only the numbers due this quarter,
              pre-filled from last time. Then they answer one question: what would help most this quarter?
            </p>
            <p>
              The numbers go to the impact team for review, and on to a portfolio view computed as in the EIF Gamma Model. The help requests go to the platform team,
              with a suggested Venture Partner, corporate partner or portfolio peer for each, and the reasons why.
            </p>
          </div>
          {__DEMO_VIDEO__ && (
            <p className="mt-6">
              <LinkArrow href={__DEMO_VIDEO__}>Watch the 60-second demo</LinkArrow>
            </p>
          )}
        </div>
        <div className="flex flex-col justify-end border-t border-hairline lg:border-l lg:border-t-0">
          <NumberCell label="Check-ins received" value={`${done.length} of ${state.companies.length}`} caption={`${CURRENT_QUARTER}, collected in October`} minHeight="min-h-[9rem]" />
          <NumberCell label="Median founder time" value={minutes === null ? '–' : fmtDuration(minutes)} caption="From opening the check-in to submitting it" minHeight="min-h-[9rem]" />
          <NumberCell label="Fields pre-filled" value={shown ? fmtPct(prefilled / shown) : '–'} caption="Annual fields wait for the Q4 check-in" minHeight="min-h-[9rem]" />
        </div>
      </section>

      <section className="grid border-b border-hairline md:grid-cols-2" aria-label="Choose a view">
        <div className="border-hairline p-cell md:border-r">
          <h2 className="text-medium">I&apos;m a founder</h2>
          <p className="mt-2 text-small text-ink-2">Pick your company to open its {CURRENT_QUARTER} check-in.</p>
          <form
            className="mt-6 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/check-in/${companyId}`);
            }}
          >
            <label className="block min-w-[16rem] flex-1">
              <span className="text-small text-ink-2">Your company</span>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="mt-1 h-10 w-full border border-hairline bg-bg px-3 text-small text-ink"
              >
                {[...state.companies]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.stage}, {c.sector}
                    </option>
                  ))}
              </select>
            </label>
            <Button type="submit" icon="→">
              Start check-in
            </Button>
          </form>
        </div>
        <div className="p-cell">
          <h2 className="text-medium">I&apos;m on the fund team</h2>
          <p className="mt-2 text-small text-ink-2">Review impact numbers, or work the platform inbox.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/impact" className="inline-flex items-center gap-2 bg-bg-alt px-3 pb-1.5 pt-2.5 text-small text-ink-on-light">
              Impact review <span aria-hidden="true">→</span>
            </Link>
            <Link to="/platform" className="inline-flex items-center gap-2 bg-bg-alt px-3 pb-1.5 pt-2.5 text-small text-ink-on-light">
              Platform inbox <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-3" aria-label="How it works">
        {[
          ['Asked at its real cadence', 'Impact KPIs every quarter. The yearly PAI and ESG fields only in the Q4 check-in, pre-filled from last year. Nothing asked twice.'],
          ['Data quality built in', 'Every value has a definition, a unit, a period, an estimate flag and an evidence note. Big jumps need a note. The impact team accepts or queries each value.'],
          ['Platform measured by outcomes', 'Intros are double opt-in drafts, capacity-aware and closed with a rating. The inbox reports days to intro, share resolved and rating.'],
        ].map(([t, d]) => (
          <div key={t} className="cell">
            <h2 className="text-small">{t}</h2>
            <p className="mt-2 text-small text-ink-2">{d}</p>
          </div>
        ))}
      </section>
    </>
  );
}
