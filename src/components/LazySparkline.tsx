import { lazy, Suspense, type ComponentProps } from 'react';
import type { Sparkline as SparklineType } from './Sparkline';

// Recharts is the largest dependency. Loading it lazily lets each page paint its text first; the
// placeholder keeps the chart's height so nothing shifts when it arrives.
const Sparkline = lazy(() => import('./Sparkline').then((m) => ({ default: m.Sparkline })));

export function LazySparkline(props: ComponentProps<typeof SparklineType>) {
  return (
    <Suspense fallback={<div style={{ height: props.height ?? 72 }} aria-hidden="true" />}>
      <Sparkline {...props} />
    </Suspense>
  );
}
