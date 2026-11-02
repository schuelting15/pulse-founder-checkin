import { describe, expect, it } from 'vitest';
import { company, helper, req } from './fixtures.test-helpers';
import { deriveGeos, deriveTags, matchHelpers, matchPeers, peerDinners, type MatchContext } from './match';

const A = company({ id: 'a', name: 'Alpha', stage: 'Seed', sector: 'Energy tech', country: 'SE' });
const P1 = company({ id: 'p1', name: 'Peer One', stage: 'Series A', sector: 'Energy tech' });
const P2 = company({ id: 'p2', name: 'Peer Two', stage: 'Series A', sector: 'Healthtech' });
const P3 = company({ id: 'p3', name: 'Peer Three', stage: 'Series B', sector: 'Energy tech' });
const P4 = company({ id: 'p4', name: 'Peer Four', stage: 'Series A', sector: 'Energy tech' });

const H1 = helper({ id: 'h1', name: 'Ingrid', expertise: ['hiring'], tags: ['us-expansion', 'sales-hiring'], sectors: ['Energy tech'], geos: ['US'], capacityPerQuarter: 3 });
const H2 = helper({ id: 'h2', name: 'Zoe', expertise: ['hiring'], tags: ['sales-hiring'], sectors: ['Education'], geos: ['GB'], capacityPerQuarter: 2 });
const H4 = helper({ id: 'h4', name: 'Aaron', expertise: ['hiring'], tags: ['sales-hiring'], sectors: ['Education'], geos: ['GB'], capacityPerQuarter: 2 });
const H3 = helper({ id: 'h3', name: 'Full', expertise: ['hiring'], capacityPerQuarter: 1 });

const history = [
  // Ingrid: one rated intro, 5/5 → pastSuccess 1.0
  req({ id: 'r1', companyId: 'p1', quarter: '2026-Q2', status: 'resolved', helperId: 'h1', rating: 5, text: 'Our first US account executive' }),
  // Zoe: one rated intro, 3/5 → pastSuccess 0
  req({ id: 'r2', companyId: 'p2', quarter: '2026-Q2', status: 'resolved', helperId: 'h2', rating: 4, category: 'fundraising' }),
  req({ id: 'r2b', companyId: 'p2', quarter: '2026-Q1', status: 'resolved', helperId: 'h2', rating: 3, category: 'fundraising' }),
  // Peers that solved hiring
  req({ id: 'r3', companyId: 'p2', quarter: '2026-Q1', status: 'resolved', rating: 4, text: 'Engineering lead' }),
  req({ id: 'r4', companyId: 'p3', quarter: '2026-Q1', status: 'resolved', rating: 5, text: 'Plant manager' }),
  req({ id: 'r5', companyId: 'p4', quarter: '2026-Q1', status: 'resolved', rating: 3, text: 'Rated too low to count' }),
  // This quarter: Ingrid has 1 intro drafted (1 of 3 used); Full is at capacity (1 of 1)
  req({ id: 'r6', companyId: 'p3', status: 'intro_drafted', helperId: 'h1' }),
  req({ id: 'r7', companyId: 'p4', status: 'intro_sent', helperId: 'h3' }),
];
const ctx: MatchContext = { companies: [A, P1, P2, P3, P4], helpers: [H2, H3, H1, H4], requests: history, quarter: '2026-Q3' };
const request = req({ id: 'new', companyId: 'a', text: 'Hiring our first US sales lead' });

describe('derived tags and geos', () => {
  it('reads keywords; acronyms only as whole words in capitals', () => {
    expect(deriveTags('Hiring our first US sales lead')).toEqual(['us-expansion', 'sales-hiring']);
    expect(deriveGeos('Hiring our first US sales lead')).toEqual(['US']);
    expect(deriveGeos('tell us more about business')).toEqual([]);
  });
});

describe('matchHelpers', () => {
  const m = matchHelpers(request, ctx);
  it('scores with the published formula', () => {
    // Ingrid: 3 + 2 (two shared tags) + 2 (Energy tech) + 1 (US) + 2·1.0 − 1·(1/3) = 9.67
    expect(m[0].helper.id).toBe('h1');
    expect(m[0].score).toBe(9.67);
    expect(m[0].parts).toEqual({ category: 3, tags: 2, sector: 2, geo: 1, pastSuccess: 2, load: -1 / 3 });
    // Zoe and Aaron: 3 + 1 (sales-hiring) + 0 + 0 + 2·(1/2 rated ≥ 4 for Zoe; 0 for Aaron) − 0
    expect(m.find((x) => x.helper.id === 'h2')?.score).toBe(5);
    expect(m.find((x) => x.helper.id === 'h4')?.score).toBe(4);
  });
  it('excludes helpers at capacity', () => {
    expect(m.map((x) => x.helper.id)).not.toContain('h3');
  });
  it('is deterministic: ties are broken by name', () => {
    const tie = matchHelpers(request, { ...ctx, requests: history.filter((r) => r.helperId !== 'h2') });
    expect(tie.slice(1).map((x) => x.helper.name)).toEqual(['Aaron', 'Zoe']);
  });
  it('explains every term with a reason chip', () => {
    expect(m[0].reasons).toEqual([
      'Expertise: hiring',
      'Shared tags: us expansion, sales hiring',
      'Works in Energy tech',
      'Covers United States',
      'Rated 5/5 on a hiring intro in 2026-Q2',
      '2 of 3 intro slots free',
    ]);
  });
});

describe('matchPeers', () => {
  it('prefers one stage ahead and same sector; rating ≥ 4 only', () => {
    // P1: 2 + 1 + 0.5 = 3.5 · P2: 2 + 0 + 0.4 = 2.4 · P3: 0 + 1 + 0.5 = 1.5 · P4 excluded (3/5)
    const peers = matchPeers(request, ctx);
    expect(peers.map((p) => p.company.id)).toEqual(['p1', 'p2']);
    expect(peers[0].reasons).toEqual(['Series A, one stage ahead', 'Same sector: Energy tech', 'Solved "Our first US account executive" in 2026-Q2, rated 5/5']);
    expect(matchPeers(request, ctx, 5).map((p) => p.company.id)).toEqual(['p1', 'p2', 'p3']);
  });
});

describe('peerDinners', () => {
  it('needs three companies with open requests in one category this quarter', () => {
    const two = [req({ id: 'o1', companyId: 'a' }), req({ id: 'o2', companyId: 'p1' })];
    expect(peerDinners({ ...ctx, requests: two })).toEqual([]);
    const three = [...two, req({ id: 'o3', companyId: 'p2' }), req({ id: 'o4', companyId: 'p2' })];
    const d = peerDinners({ ...ctx, requests: three });
    expect(d).toHaveLength(1);
    expect(d[0].companies.map((c) => c.id)).toEqual(['a', 'p1', 'p2']); // sorted by name, p2 once
    expect(d[0].host?.helper.kind).toBe('venture_partner');
  });
  it('ignores resolved requests and other quarters', () => {
    const r = [
      req({ id: 'o1', companyId: 'a' }),
      req({ id: 'o2', companyId: 'p1', status: 'resolved' }),
      req({ id: 'o3', companyId: 'p2', quarter: '2026-Q2' }),
    ];
    expect(peerDinners({ ...ctx, requests: r })).toEqual([]);
  });
});

describe('"Something else" requests', () => {
  const team = helper({ id: 't', name: 'Platform team', kind: 'team', expertise: ['other'] });
  const other = (id: string, companyId: string) => req({ id, companyId, category: 'other', text: 'Press coverage for our launch' });
  it('go to the helper that triages them, with no peers', () => {
    const peerHistory = [...history, req({ id: 'po', companyId: 'p1', category: 'other', status: 'resolved', rating: 5 })];
    const c = { ...ctx, helpers: [...ctx.helpers, team], requests: peerHistory };
    // Without the rule Ingrid would win on sector and track record: 2 + 2 − 1/3 = 3.67 > 3.
    expect(matchHelpers(other('n', 'a'), c).map((m) => m.helper.id)).toEqual(['t']);
    expect(matchPeers(other('n', 'a'), c)).toEqual([]);
  });
  it('never make a peer dinner, even from three companies', () => {
    const three = [other('o1', 'a'), other('o2', 'p1'), other('o3', 'p2')];
    expect(peerDinners({ ...ctx, helpers: [...ctx.helpers, team], requests: three })).toEqual([]);
  });
});
