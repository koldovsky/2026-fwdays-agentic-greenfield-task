import React from 'react';

export function CountdownIntro({ count = 3, label = 'FIGHT' }) {
  return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '48px 0', fontFamily: 'var(--font-sans)' } },
    React.createElement('div', { key: count, style: { fontFamily: 'var(--font-serif)', fontSize: '96px', lineHeight: 1, color: 'var(--text)', animation: 'ds-pop var(--dur-med) var(--ease-out) both' } }, count > 0 ? count : label),
    React.createElement('div', { style: { color: 'var(--text-muted)', fontSize: '13px', letterSpacing: '.3em', textTransform: 'uppercase' } }, count > 0 ? 'get ready' : '')
  );
}
