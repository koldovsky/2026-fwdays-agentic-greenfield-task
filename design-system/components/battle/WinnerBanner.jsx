import React from 'react';

/* The pop-in verdict line under the score. side: 'a' | 'b' | 'draw'. */
export function WinnerBanner({ name, side = 'a' }) {
  const color = side === 'a' ? 'var(--accent-primary)' : side === 'b' ? 'var(--accent-secondary)' : 'var(--text-muted)';
  return React.createElement('div', {
    style: { marginTop: '14px', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '20px', color, animation: 'ds-pop var(--dur-slow) var(--ease-out) both' },
  },
    side === 'draw' ? "It's a draw" : ['Winner · ', React.createElement('strong', { key: 's' }, name)]
  );
}
