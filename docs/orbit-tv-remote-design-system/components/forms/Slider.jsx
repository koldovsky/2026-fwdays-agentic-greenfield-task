import React from 'react';

/**
 * Slider — neumorphic groove slider for volume/brightness. Inset track,
 * raised circular thumb, accent-filled progress within the groove.
 */
export function Slider({ value = 50, min = 0, max = 100, onChange, icon }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
      {icon && (
        <span className="material-symbols-rounded" style={{ fontSize: 22, color: 'var(--fg-2)', flexShrink: 0 }}>
          {icon}
        </span>
      )}
      <div
        style={{
          position: 'relative',
          flex: 1,
          height: 14,
          borderRadius: 'var(--radius-full)',
          background: 'var(--base-100)',
          boxShadow: 'var(--nm-inset-sm)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${pct}%`,
            borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(90deg, var(--accent-soft), var(--accent))',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `calc(${pct}% - 12px)`,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'var(--base-100)',
            boxShadow: 'var(--nm-raised-sm)',
            transform: 'translateY(-50%)',
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange && onChange(Number(e.target.value))}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
        />
      </div>
      <span style={{ fontSize: 'var(--text-body-sm)', color: 'var(--fg-2)', width: 28, textAlign: 'right', flexShrink: 0 }}>
        {value}
      </span>
    </div>
  );
}
