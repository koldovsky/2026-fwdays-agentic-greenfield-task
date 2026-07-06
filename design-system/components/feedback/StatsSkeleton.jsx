import React from 'react';
import { Skeleton } from './Skeleton.jsx';

export function StatsSkeleton() {
  const cell = (i) => React.createElement('div', { key: i, style: { padding: '18px 16px', background: 'var(--surface)' } },
    React.createElement(Skeleton, { width: '55%', height: 12 }),
    React.createElement('div', { style: { height: 12 } }),
    React.createElement(Skeleton, { width: '45%', height: 26 }));
  return React.createElement('div', { style: { maxWidth: 1040, margin: '0 auto', padding: '40px 0 70px' } },
    React.createElement('div', { style: { display: 'flex', gap: 22, alignItems: 'flex-start', paddingBottom: 26, borderBottom: '1px solid var(--border)' } },
      React.createElement(Skeleton, { width: 88, height: 88, radius: 'var(--radius-pill)' }),
      React.createElement('div', { style: { flex: 1 } },
        React.createElement(Skeleton, { width: 220, height: 28 }),
        React.createElement('div', { style: { height: 10 } }),
        React.createElement(Skeleton, { width: 120, height: 15 }),
        React.createElement('div', { style: { height: 14 } }),
        React.createElement(Skeleton, { width: '70%', height: 15 }))),
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginTop: 28 } },
      Array.from({ length: 15 }).map((_, i) => cell(i)))
  );
}
