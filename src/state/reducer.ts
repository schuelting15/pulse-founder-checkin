// Every change to demo state goes through this reducer and appends an AuditEntry.
// Pure: callers pass `at` (ISO time) and ids, so tests can replay actions exactly.
import { CURRENT_QUARTER, type CategoryId, type Urgency } from '../lib/config';
import { deriveTags } from '../lib/match';
import type { AuditEntry, DemoState, HelpRequest, Value } from '../lib/types';

export interface SubmittedEntry {
  metricId: string;
  period: string;
  value: number | boolean | null;
  previous?: number | boolean | null;
  isEstimate: boolean;
  evidenceNote?: string;
  comment?: string;
  prefilled: boolean;
  changed: boolean;
}

export interface NewRequest {
  id: string;
  category: CategoryId;
  text: string;
  urgency: Urgency;
}

export type Action =
  | { type: 'reset'; state: DemoState }
  | { type: 'startCheckIn'; companyId: string; at: string }
  | { type: 'submitCheckIn'; companyId: string; at: string; entries: SubmittedEntry[]; requests: NewRequest[] }
  | { type: 'acceptValue'; companyId: string; metricId: string; period: string; at: string }
  | { type: 'queryValue'; companyId: string; metricId: string; period: string; at: string; note: string }
  | { type: 'answerQuery'; companyId: string; metricId: string; period: string; at: string; value: number | boolean | null; comment: string }
  | { type: 'draftIntro'; requestId: string; at: string; helperId?: string; peerCompanyId?: string }
  | { type: 'sendIntro'; requestId: string; at: string }
  | { type: 'resolveRequest'; requestId: string; at: string; rating: 1 | 2 | 3 | 4 | 5 };

const sameValue = (v: Value, companyId: string, metricId: string, period: string) =>
  v.companyId === companyId && v.metricId === metricId && v.period === period;

function updateValue(state: DemoState, a: { companyId: string; metricId: string; period: string }, patch: Partial<Value>, entry: Omit<AuditEntry, 'companyId' | 'metricId'>): DemoState {
  const current = state.values.find((v) => sameValue(v, a.companyId, a.metricId, a.period));
  if (!current) return state;
  return {
    ...state,
    values: state.values.map((v) => (v === current ? { ...v, ...patch } : v)),
    audit: [...state.audit, { ...entry, companyId: a.companyId, metricId: a.metricId }],
  };
}

function updateRequest(state: DemoState, id: string, patch: Partial<HelpRequest>, entry: Omit<AuditEntry, 'companyId' | 'requestId'>): DemoState {
  const r = state.requests.find((x) => x.id === id);
  if (!r) return state;
  return {
    ...state,
    requests: state.requests.map((x) => (x === r ? { ...x, ...patch } : x)),
    audit: [...state.audit, { ...entry, companyId: r.companyId, requestId: id }],
  };
}

export function reducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case 'reset':
      return action.state;

    case 'startCheckIn': {
      const id = `ci_${action.companyId}_${CURRENT_QUARTER}`;
      if (state.checkIns.some((c) => c.id === id)) return state;
      return {
        ...state,
        checkIns: [...state.checkIns, { id, companyId: action.companyId, quarter: CURRENT_QUARTER, startedAt: action.at, fieldsShown: 0, fieldsPrefilled: 0 }],
        audit: [...state.audit, { at: action.at, actor: 'founder', companyId: action.companyId, action: `Check-in started (${CURRENT_QUARTER})` }],
      };
    }

    case 'submitCheckIn': {
      const { companyId, at } = action;
      let values = state.values;
      const audit: AuditEntry[] = [];
      for (const e of action.entries) {
        const existing = values.find((v) => sameValue(v, companyId, e.metricId, e.period));
        // Re-submitting a check-in leaves accepted values alone unless the founder changed them.
        if (
          existing?.status === 'accepted' &&
          existing.value === e.value &&
          existing.isEstimate === e.isEstimate &&
          (existing.evidenceNote ?? '') === (e.evidenceNote ?? '')
        )
          continue;
        const next: Value = {
          metricId: e.metricId, companyId, period: e.period, value: e.value, isEstimate: e.isEstimate,
          evidenceNote: e.evidenceNote || undefined, comment: e.comment || undefined, status: 'submitted', submittedAt: at,
        };
        values = values.some((v) => sameValue(v, companyId, e.metricId, e.period))
          ? values.map((v) => (sameValue(v, companyId, e.metricId, e.period) ? next : v))
          : [...values, next];
        audit.push({
          at, actor: 'founder', companyId, metricId: e.metricId,
          action: existing?.status === 'queried' ? 'Query answered' : e.changed ? 'Value submitted' : 'Value confirmed', from: e.previous, to: e.value,
          note: [e.isEstimate ? 'Estimate' : '', e.evidenceNote ?? '', e.comment ?? ''].filter(Boolean).join(' · ') || undefined,
        });
      }
      const requests: HelpRequest[] = action.requests.map((r) => ({
        id: r.id, companyId, createdAt: at, quarter: CURRENT_QUARTER, category: r.category, text: r.text.trim(),
        tags: deriveTags(r.text), urgency: r.urgency, status: 'new',
      }));
      for (const r of requests) audit.push({ at, actor: 'founder', companyId, requestId: r.id, action: 'Request created', note: r.text });
      audit.push({ at, actor: 'founder', companyId, action: `Check-in submitted (${CURRENT_QUARTER})` });
      const id = `ci_${companyId}_${CURRENT_QUARTER}`;
      const summary = {
        submittedAt: at,
        fieldsShown: action.entries.length,
        fieldsPrefilled: action.entries.filter((e) => e.prefilled).length,
        fieldsChanged: action.entries.filter((e) => e.changed).length,
      };
      const exists = state.checkIns.some((c) => c.id === id);
      const checkIns = exists
        ? state.checkIns.map((c) => (c.id === id ? { ...c, ...summary } : c))
        : [...state.checkIns, { id, companyId, quarter: CURRENT_QUARTER, startedAt: at, ...summary }];
      return { ...state, values, checkIns, requests: [...state.requests, ...requests], audit: [...state.audit, ...audit] };
    }

    case 'acceptValue':
      return updateValue(state, action, { status: 'accepted', reviewedAt: action.at, reviewNote: undefined }, { at: action.at, actor: 'impact_team', action: 'Value accepted' });

    case 'queryValue':
      return updateValue(state, action, { status: 'queried', reviewedAt: action.at, reviewNote: action.note }, { at: action.at, actor: 'impact_team', action: 'Value queried', note: action.note });

    case 'answerQuery': {
      const before = state.values.find((v) => sameValue(v, action.companyId, action.metricId, action.period));
      return updateValue(
        state,
        action,
        { value: action.value, comment: action.comment, status: 'submitted', submittedAt: action.at },
        { at: action.at, actor: 'founder', action: 'Query answered', from: before?.value, to: action.value, note: action.comment },
      );
    }

    case 'draftIntro':
      return updateRequest(
        state,
        action.requestId,
        { status: 'intro_drafted', helperId: action.helperId, peerCompanyId: action.peerCompanyId },
        { at: action.at, actor: 'platform_team', action: 'Intro drafted', to: action.helperId ?? action.peerCompanyId },
      );

    case 'sendIntro':
      return updateRequest(state, action.requestId, { status: 'intro_sent', introSentAt: action.at }, { at: action.at, actor: 'platform_team', action: 'Intro sent' });

    case 'resolveRequest':
      return updateRequest(
        state,
        action.requestId,
        { status: 'resolved', resolvedAt: action.at, rating: action.rating },
        { at: action.at, actor: 'platform_team', action: 'Request resolved', to: `${action.rating}/5` },
      );
  }
}
