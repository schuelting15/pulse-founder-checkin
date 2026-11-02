// Plain-language labels shared by the screens.
import type { HelpRequest, Value } from './types';

export const reviewLabel = (s: Value['status']) => ({ draft: 'Draft', submitted: 'Awaiting review', accepted: 'Accepted', queried: 'Queried' })[s];
export const requestLabel = (s: HelpRequest['status']) => ({ new: 'New', intro_drafted: 'Intro drafted', intro_sent: 'Intro sent', resolved: 'Resolved' })[s];
export const KPI_TYPE_LABEL: Record<string, string> = { business: 'Business KPI', attributable_impact: 'Attributable impact KPI', operational: 'Operational KPI' };
