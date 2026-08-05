import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDailySummary } from '@/hooks/useReports';

/** Раскладывает смены по часам суток: сколько операторов было на линии в каждый час */
export function LoadChart() {
  const { data, isLoading } = useDailySummary();

  const series = useMemo(() => {
    const buckets = Array.from({ length: 15 }, (_, i) => ({ hour: `${String(i + 7).padStart(2, '0')}`, count: 0 }));
    for (const row of data ?? []) {
      if (!row.first_start) continue;
      const from = new Date(row.first_start).getHours();
      const to = row.last_end ? new Date(row.last_end).getHours() : new Date().getHours();
      for (let h = from; h <= to; h += 1) {
        const idx = h - 7;
        const bucket = buckets[idx];
        if (bucket) bucket.count += 1;
      }
    }
    return buckets;
  }, [data]);

  if (isLoading) return <div className="skeleton h-[150px] w-full rounded-md" />;

  return (
    <ResponsiveContainer width="100%" height={150}>
      <AreaChart data={series} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="emberFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.665 0.185 32)" stopOpacity={0.34} />
            <stop offset="100%" stopColor="oklch(0.665 0.185 32)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="oklch(0.225 0.012 322)" vertical={false} />
        <XAxis dataKey="hour" tickLine={false} axisLine={{ stroke: 'oklch(0.245 0.012 322)' }}
               tick={{ fill: 'oklch(0.575 0.013 322)', fontSize: 11 }} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false}
               tick={{ fill: 'oklch(0.575 0.013 322)', fontSize: 11 }} />
        <Tooltip
          cursor={{ stroke: 'oklch(0.315 0.013 322)' }}
          contentStyle={{
            background: 'oklch(0.225 0.013 322)',
            border: '1px solid oklch(0.315 0.013 322)',
            borderRadius: 9,
            fontSize: 12,
            color: 'oklch(0.955 0.005 322)',
          }}
          labelFormatter={(l: string) => `${l}:00`}
          formatter={(v: number) => [`${v} операторов`, 'На линии']}
        />
        <Area type="monotone" dataKey="count" stroke="oklch(0.665 0.185 32)" strokeWidth={2}
              fill="url(#emberFade)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
