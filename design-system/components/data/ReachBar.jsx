import React from 'react';

export function ReachBar({ label, value, valueFmt, max = 100 }) {
  const pct = Math.max(2, Math.round((value / (max || 1)) * 100));
  return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '15px', fontFamily: 'var(--font-sans)' } },
    React.createElement('div', { style: { width: '90px', fontSize: '14px' } }, label),
    React.createElement('div', { style: { flex: 1, height: '22px', background: 'var(--surface-track)', borderRadius: '6px', overflow: 'hidden' } },
      React.createElement('div', { style: { height: '100%', width: pct + '%', background: 'var(--accent-primary)', borderRadius: '6px' } })),
    React.createElement('div', { style: { width: '74px', textAlign: 'right', fontFamily: 'var(--font-serif)', fontSize: '19px' } }, valueFmt != null ? valueFmt : value)
  );
}
