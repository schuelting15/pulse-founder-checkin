import { describe, expect, it } from 'vitest';
import { DEMO_COMPANY_ID, createSeed } from '../data/seed';
import { CURRENT_QUARTER } from '../lib/config';
import { companyStatus } from '../lib/status';
import { reducer } from './reducer';

const at = '2026-10-25T10:00:00Z';

describe('reducer: the demo flow, end to end on data', () => {
  let s = createSeed();
  const auditBefore = s.audit.length;

  it('starting a check-in records a CheckIn and an audit entry once', () => {
    s = reducer(s, { type: 'startCheckIn', companyId: DEMO_COMPANY_ID, at });
    const again = reducer(s, { type: 'startCheckIn', companyId: DEMO_COMPANY_ID, at });
    expect(again).toBe(s);
    expect(s.audit.length).toBe(auditBefore + 1);
  });

  it('submitting stores values as submitted, counts pre-filled fields, creates the request', () => {
    s = reducer(s, {
      type: 'submitCheckIn',
      companyId: DEMO_COMPANY_ID,
      at: '2026-10-25T10:02:10Z',
      entries: [
        { metricId: 'hearthline_installs', period: CURRENT_QUARTER, value: 700, previous: 640, isEstimate: false, prefilled: true, changed: true },
        { metricId: 'hearthline_co2', period: CURRENT_QUARTER, value: 1900, previous: 1150, isEstimate: false, evidenceNote: 'First metered data.', prefilled: true, changed: true },
        { metricId: 'hearthline_partners', period: CURRENT_QUARTER, value: 20, previous: 20, isEstimate: false, prefilled: true, changed: false },
      ],
      requests: [{ id: 'req_demo', category: 'hiring', text: 'Hiring our first US sales lead', urgency: 'This quarter' }],
    });
    const co2 = s.values.find((v) => v.metricId === 'hearthline_co2' && v.period === CURRENT_QUARTER)!;
    expect(co2).toMatchObject({ value: 1900, status: 'submitted', evidenceNote: 'First metered data.' });
    const ci = s.checkIns.find((c) => c.companyId === DEMO_COMPANY_ID && c.quarter === CURRENT_QUARTER)!;
    expect(ci).toMatchObject({ fieldsShown: 3, fieldsPrefilled: 3, fieldsChanged: 2, submittedAt: '2026-10-25T10:02:10Z' });
    const r = s.requests.find((x) => x.id === 'req_demo')!;
    expect(r).toMatchObject({ status: 'new', quarter: CURRENT_QUARTER, tags: ['us-expansion', 'sales-hiring'] });
    expect(companyStatus(s.metrics, s.values, DEMO_COMPANY_ID, CURRENT_QUARTER)).toBe('on_track');
  });

  it('accepting and querying are audited', () => {
    s = reducer(s, { type: 'acceptValue', companyId: DEMO_COMPANY_ID, metricId: 'hearthline_co2', period: CURRENT_QUARTER, at });
    expect(s.values.find((v) => v.metricId === 'hearthline_co2' && v.period === CURRENT_QUARTER)!.status).toBe('accepted');
    s = reducer(s, { type: 'queryValue', companyId: DEMO_COMPANY_ID, metricId: 'hearthline_installs', period: CURRENT_QUARTER, at, note: 'Source?' });
    const q = s.values.find((v) => v.metricId === 'hearthline_installs' && v.period === CURRENT_QUARTER)!;
    expect(q).toMatchObject({ status: 'queried', reviewNote: 'Source?' });
    s = reducer(s, { type: 'answerQuery', companyId: DEMO_COMPANY_ID, metricId: 'hearthline_installs', period: CURRENT_QUARTER, at, value: 702, comment: 'Two late certificates.' });
    expect(s.values.find((v) => v.metricId === 'hearthline_installs' && v.period === CURRENT_QUARTER)!).toMatchObject({ status: 'submitted', value: 702 });
    const trail = s.audit.filter((e) => e.metricId === 'hearthline_installs').map((e) => e.action);
    expect(trail.slice(-3)).toEqual(['Value submitted', 'Value queried', 'Query answered']);
  });

  it('intro flow: drafted → sent → resolved with rating', () => {
    s = reducer(s, { type: 'draftIntro', requestId: 'req_demo', helperId: 'vp_holm', at });
    s = reducer(s, { type: 'sendIntro', requestId: 'req_demo', at: '2026-10-27T09:00:00Z' });
    s = reducer(s, { type: 'resolveRequest', requestId: 'req_demo', rating: 5, at: '2026-11-20T09:00:00Z' });
    expect(s.requests.find((r) => r.id === 'req_demo')).toMatchObject({ status: 'resolved', helperId: 'vp_holm', rating: 5, introSentAt: '2026-10-27T09:00:00Z' });
    expect(s.audit.filter((e) => e.requestId === 'req_demo').map((e) => e.action)).toEqual(['Request created', 'Intro drafted', 'Intro sent', 'Request resolved']);
  });

  it('re-submitting keeps unchanged accepted values accepted; a queried value comes back with its answer', () => {
    let t = createSeed();
    t = reducer(t, {
      type: 'submitCheckIn',
      companyId: 'fairpath',
      at,
      entries: [
        { metricId: 'fairpath_borrowers', period: CURRENT_QUARTER, value: 21000, previous: 21000, isEstimate: false, prefilled: true, changed: false },
        { metricId: 'fairpath_defaults', period: CURRENT_QUARTER, value: 5.0, previous: 5.0, isEstimate: false, evidenceNote: 'Since launch, as defined.', prefilled: true, changed: false },
      ],
      requests: [],
    });
    const get = (id: string) => t.values.find((v) => v.metricId === id && v.period === CURRENT_QUARTER)!;
    expect(get('fairpath_borrowers').status).toBe('accepted');
    expect(get('fairpath_defaults')).toMatchObject({ status: 'submitted', evidenceNote: 'Since launch, as defined.' });
    expect(t.audit.filter((e) => e.metricId === 'fairpath_defaults').at(-1)?.action).toBe('Query answered');
  });

  it('the audit log only grows', () => {
    expect(s.audit.length).toBeGreaterThan(auditBefore);
  });
});
