import React from 'react';

export function ScoreHeader({ nameA, nameB, avatarA, avatarB, scoreA = 0, scoreB = 0 }) {
  const side = (name, avatar, align) => React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '11px', flexDirection: align === 'right' ? 'row-reverse' : 'row' } },
    avatar ? React.createElement('img', { src: avatar, alt: '', style: { width: '52px', height: '52px', borderRadius: '999px' } }) : null,
    React.createElement('span', { style: { fontFamily: 'var(--font-serif)', fontSize: '22px' } }, name));
  return React.createElement('div', { style: { textAlign: 'center', fontFamily: 'var(--font-sans)' } },
    React.createElement('div', { style: { color: 'var(--text-muted)', fontSize: '13px', letterSpacing: '.04em' } }, 'HEAD TO HEAD'),
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '22px', marginTop: '14px' } },
      side(nameA, avatarA, 'left'),
      React.createElement('span', { style: { fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '22px' } }, 'vs'),
      side(nameB, avatarB, 'right')),
    React.createElement('div', { style: { fontFamily: 'var(--font-serif)', fontSize: '44px', marginTop: '16px' } },
      React.createElement('span', { style: { color: 'var(--accent-primary)' } }, scoreA),
      React.createElement('span', { style: { color: 'var(--text-muted)', margin: '0 12px', fontSize: '26px' } }, '—'),
      React.createElement('span', { style: { color: 'var(--accent-secondary)' } }, scoreB))
  );
}
