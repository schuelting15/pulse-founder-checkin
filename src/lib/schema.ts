// Validation with zod: type and unit, no negatives where impossible, yes/no for booleans.
import { z } from 'zod';
import { MAX_REQUESTS_PER_CHECKIN, REQUEST_CATEGORIES, URGENCIES } from './config';
import type { Metric } from './types';

/** Schema for one value of a metric. Counts and quantities cannot be negative; a pay gap can (allowNegative). */
export function valueSchema(metric: Metric) {
  if (metric.valueType === 'boolean') return z.boolean({ required_error: 'Answer yes or no.', invalid_type_error: 'Answer yes or no.' });
  const base = z
    .number({ required_error: `Enter a number in ${metric.unit}.`, invalid_type_error: `Enter a number in ${metric.unit}.` })
    .finite(`Enter a number in ${metric.unit}.`);
  const signed = metric.allowNegative ? base : base.nonnegative('This cannot be negative.');
  return metric.valueType === 'integer' ? signed.int(`Enter a whole number of ${metric.unit}.`) : signed;
}

export const requestSchema = z.object({
  category: z.enum(REQUEST_CATEGORIES.map((c) => c.id) as [string, ...string[]], { errorMap: () => ({ message: 'Pick a category.' }) }),
  text: z
    .string()
    .trim()
    .min(10, 'Say what would help in a sentence or two.')
    .max(280, 'Keep it to one or two sentences (280 characters).'),
  urgency: z.enum(URGENCIES, { errorMap: () => ({ message: 'Pick when you need it.' }) }),
});

export const requestsSchema = z.array(requestSchema).max(MAX_REQUESTS_PER_CHECKIN);

/** Shallow check of persisted demo state; anything else is discarded and the seed is restored. */
export const demoStateSchema = z.object({
  version: z.literal(2),
  companies: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()),
  metrics: z.array(z.object({ id: z.string(), label: z.string() }).passthrough()),
  values: z.array(z.object({ metricId: z.string(), companyId: z.string(), period: z.string(), status: z.string() }).passthrough()),
  helpers: z.array(z.object({ id: z.string() }).passthrough()),
  requests: z.array(z.object({ id: z.string(), status: z.string() }).passthrough()),
  checkIns: z.array(z.object({ id: z.string() }).passthrough()),
  audit: z.array(z.object({ at: z.string(), action: z.string() }).passthrough()),
});
