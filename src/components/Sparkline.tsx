import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtNumber } from '../lib/format';

export type SparkPoint = { period: string; actual?: number; target?: number };

const tick = { fill: 'var(--pulse-ink-2)', fontSize: 11 };

/**
 * Actual vs target path for one KPI. Single series plus a dashed target, so no legend: the card
 * title names it and the caption says what the dashed line is. Hover shows exact values.
 */
export function Sparkline({ data, unit, height = 72, axes = false }: { data: SparkPoint[]; unit: string; height?: number; axes?: boolean }) {
  const label = `Actual and target path, ${unit}, ${data[0]?.period} to ${data[data.length - 1]?.period}`;
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={axes ? { top: 8, right: 12, bottom: 0, left: 0 } : { top: 6, right: 6, bottom: 2, left: 6 }}>
          {axes && <CartesianGrid stroke="var(--pulse-chart-grid)" vertical={false} />}
          <XAxis dataKey="period" hide={!axes} tick={tick} stroke="var(--pulse-chart-grid)" tickLine={false} />
          <YAxis hide={!axes} tick={tick} stroke="var(--pulse-chart-grid)" tickLine={false} width={56} tickFormatter={(v) => fmtNumber(Number(v), 0)} domain={['auto', 'auto']} />
          <Tooltip
            cursor={{ stroke: 'var(--pulse-chart-grid)', strokeWidth: 1 }}
            contentStyle={{ background: '#000', border: '1px solid var(--pulse-hairline)', borderRadius: 0, padding: '6px 8px' }}
            labelStyle={{ color: 'var(--pulse-ink)' }}
            itemStyle={{ color: 'var(--pulse-ink)', padding: 0 }}
            formatter={(v, name) => [`${fmtNumber(Number(v))} ${unit}`, name === 'actual' ? 'Actual' : 'Target path']}
          />
          <Line dataKey="target" stroke="var(--pulse-chart-target)" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} connectNulls />
          <Line
            dataKey="actual"
            stroke="var(--pulse-chart-series)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: '#000', strokeWidth: 2 }}
            isAnimationActive={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
