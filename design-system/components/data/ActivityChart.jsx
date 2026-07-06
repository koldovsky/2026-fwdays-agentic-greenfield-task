import React from 'react';

export function ActivityChart({ data = [], height = 150 }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return React.createElement('div', { style: { display: 'flex', alignItems: 'flex-end', gap: '14px', height: height + 'px', fontFamily: 'var(--font-sans)' } },
    data.map((d) => React.createElement('div', { key: d.label, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' } },
      React.createElement('div', { style: { fontFamily: 'var(--font-serif)', fontSize: '18px' } }, d.value),
      React.createElement('div', { style: { width: '100%', background: 'var(--surface-track)', borderRadius: '7px 7px 0 0', display: 'flex', alignItems: 'flex-end', flex: 1, overflow: 'hidden' } },
        React.createElement('div', { style: { width: '100%', height: Math.max(2, Math.round(d.value / max * 100)) + '%', background: 'var(--accent-primary)', borderRadius: '7px 7px 0 0' } })),
      React.createElement('div', { style: { color: 'var(--text-muted)', fontSize: '11.5px', textAlign: 'center' } }, d.label)))
  );
}
