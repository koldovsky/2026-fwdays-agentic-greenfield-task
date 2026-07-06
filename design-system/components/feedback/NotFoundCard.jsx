import React from 'react';

/* User-not-found state for a data-fetch 404 (FR-DATA-06). */
export function NotFoundCard({ login, onBack }) {
  return React.createElement('div', { style: { margin: '60px auto', maxWidth: 520, textAlign: 'center', padding: '34px', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', background: 'var(--surface)', fontFamily: 'var(--font-sans)' } },
    React.createElement('div', { style: { fontFamily: 'var(--font-serif)', fontSize: 24, marginBottom: 8 } }, 'User not found'),
    React.createElement('div', { style: { color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 } },
      login ? ['No GitHub account for ', React.createElement('strong', { key: 'l' }, '@' + login), '. Check the spelling and try again.'] : 'That GitHub account no longer exists.'),
    onBack ? React.createElement('button', { onClick: onBack, style: { marginTop: 20, border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14, padding: '11px 22px', borderRadius: 'var(--radius-md)', background: 'transparent', color: 'var(--text)' } }, '← Back') : null
  );
}
