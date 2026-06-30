import React from 'react';

/**
 * RateChart — a calm ~30-day line of one currency's official UAH rate, so
 * the trend is visible at a glance. Built on Recharts (expects the
 * Recharts UMD global, window.Recharts). Line is brand-coloured with a
 * soft area wash; axes are quiet, figures are tabular mono. The y-domain
 * is padded around the data so small moves read honestly, not dramatised.
 */
export function RateChart({ data = [], height = 240, color = 'var(--brand)', style = {} }) {
  const R = (typeof window !== 'undefined') && window.Recharts;
  if (!R) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', ...style }}>
        Recharts not loaded
      </div>
    );
  }
  const { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, defs } = R;

  const vals = data.map((d) => d.rate);
  const min = Math.min(...vals), max = Math.max(...vals);
  const pad = Math.max((max - min) * 0.35, max * 0.004);
  const gridColor = 'var(--border-subtle)';

  const Tip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div style={{
        background: 'var(--surface-raised)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)', padding: '6px 10px',
      }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)' }}>
          {Number(payload[0].value).toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ₴
        </div>
      </div>
    );
  };

  const axisTick = { fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 };

  return (
    <div style={{ width: '100%', height, ...style }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="hryv-rate-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={gridColor} vertical={false} />
          <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--border)' }} minTickGap={28} />
          <YAxis
            domain={[min - pad, max + pad]} width={52} tick={axisTick} tickLine={false} axisLine={false}
            tickFormatter={(v) => v.toLocaleString('uk-UA', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
          />
          <Tooltip content={<Tip />} cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }} />
          <Area
            type="monotone" dataKey="rate" stroke={color} strokeWidth={2}
            fill="url(#hryv-rate-fill)" dot={false}
            activeDot={{ r: 4, fill: color, stroke: 'var(--surface)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
