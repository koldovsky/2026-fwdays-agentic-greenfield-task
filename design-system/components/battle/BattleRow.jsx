import React from 'react';

export function BattleRow({ label, aValue, bValue, winner }) {
  const cell = (val, isWin, align, color) => React.createElement('div', {
    style: { padding: '15px 20px', textAlign: align, fontFamily: 'var(--font-serif)', fontSize: '22px', color: isWin ? color : 'var(--text-muted)', fontWeight: isWin ? 600 : 400 },
  }, val);
  return React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 180px 1fr', alignItems: 'center' } },
    cell(aValue, winner === 'a', 'right', 'var(--accent-primary)'),
    React.createElement('div', { style: { textAlign: 'center', padding: '15px 8px', color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'var(--font-sans)', letterSpacing: '.02em', background: 'var(--surface-track)' } }, label),
    cell(bValue, winner === 'b', 'left', 'var(--accent-secondary)')
  );
}
