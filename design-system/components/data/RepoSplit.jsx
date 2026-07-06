import React from 'react';

export function RepoSplit({ original = 0, forked = 0 }) {
  const total = original + forked || 1;
  const oPct = Math.round((original / total) * 100);
  const chip = (color, text) => React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
    React.createElement('span', { style: { width: '12px', height: '12px', borderRadius: '3px', background: color } }), text);
  return React.createElement('div', { style: { fontFamily: 'var(--font-sans)' } },
    React.createElement('div', { style: { display: 'flex', height: '34px', borderRadius: '8px', overflow: 'hidden', background: 'var(--surface-track)' } },
      React.createElement('div', { style: { width: oPct + '%', background: 'var(--accent-primary)' } }),
      React.createElement('div', { style: { width: (100 - oPct) + '%', background: 'var(--accent-secondary)' } })),
    React.createElement('div', { style: { display: 'flex', gap: '26px', marginTop: '15px', fontSize: '14px' } },
      chip('var(--accent-primary)', 'Original · ' + original),
      chip('var(--accent-secondary)', 'Forked · ' + forked))
  );
}
