import React from 'react';

export function MetricCard({ label, value }) {
  return React.createElement('div', { style: { padding: '18px 16px', background: 'var(--surface)' } },
    React.createElement('div', { style: { color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'var(--font-sans)' } }, label),
    React.createElement('div', { style: { fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '32px', lineHeight: 1, marginTop: '10px' } }, value)
  );
}
