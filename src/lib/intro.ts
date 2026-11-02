// Double-opt-in intro drafts: first ask the helper, then introduce both sides.
// Drafts only: Pulse sends nothing.
import { COUNTRY_NAMES } from './config';
import type { Company, Helper, HelpRequest } from './types';

export interface Draft {
  to: string;
  subject: string;
  body: string;
}

const first = (name: string) => name.split(' ')[0];

/** Person on the other side of the intro: a helper, or the founder of a peer company. */
export type Counterpart = { kind: 'helper'; helper: Helper } | { kind: 'peer'; company: Company };

function counterpartName(c: Counterpart) {
  return c.kind === 'helper' ? c.helper.name : c.company.founder.name;
}

function counterpartLine(c: Counterpart) {
  if (c.kind === 'peer') return `${c.company.founder.name}, founder of ${c.company.name} (${c.company.oneLiner.replace(/\.$/, '')})`;
  return `${c.helper.name}, ${c.helper.title}${c.helper.org ? ` at ${c.helper.org}` : ''}`;
}

export function introDrafts(request: HelpRequest, company: Company, counterpart: Counterpart, reasons: string[]): { ask: Draft; intro: Draft } {
  const who = counterpartName(counterpart);
  const askTo = counterpart.kind === 'peer' ? counterpart.company.founder.email : who;
  const where = `${company.stage}, ${COUNTRY_NAMES[company.country] ?? company.country}`;
  const ask: Draft = {
    to: askTo,
    subject: `Open to an intro? ${company.name} (${where})`,
    body: [
      `Hi ${first(who)},`,
      '',
      `${company.founder.name} at ${company.name} asked us for help this quarter: "${request.text}"`,
      '',
      `${company.name}: ${company.oneLiner}`,
      `Why you: ${reasons.join('; ')}.`,
      '',
      'Would you be open to a 20-minute call? If yes, I will introduce you both. If not, no need to explain.',
      '',
      'Best,',
      'Platform team',
    ].join('\n'),
  };
  const intro: Draft = {
    to: `${company.founder.email}, ${askTo}`,
    subject: `Intro: ${company.founder.name} (${company.name}) and ${who}`,
    body: [
      `${first(company.founder.name)}, meet ${counterpartLine(counterpart)}.`,
      `${first(who)}, meet ${company.founder.name}, founder of ${company.name}. ${company.oneLiner}`,
      '',
      `The question: "${request.text}"`,
      '',
      'Both of you said yes to this intro. I will leave it with you.',
      '',
      'Best,',
      'Platform team',
    ].join('\n'),
  };
  return { ask, intro };
}
