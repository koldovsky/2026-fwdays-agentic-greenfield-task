import React from 'react';
const PAL = ['#b45a29', '#5f7355', '#3178c6', '#f1e05a', '#3572A5', '#00ADD8'];

export function LanguageDonut({ languages = [], total }) {
  let acc = 0; const segs = [];
  languages.forEach((l, i) => { const c = l.color || PAL[i % PAL.length]; const from = acc * 360; acc += l.pct; segs.push(c + ' ' + from + 'deg ' + (acc * 360) + 'deg'); });
  if (acc < 0.999) segs.push('var(--surface-track) ' + (acc * 360) + 'deg 360deg');
  return React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '26px', flexWrap: 'wrap', fontFamily: 'var(--font-sans)' } },
    React.createElement('div', { style: { position: 'relative', width: '148px', height: '148px', flexShrink: 0 } },
      React.createElement('div', { style: { position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(' + segs.join(',') + ')' } }),
      React.createElement('div', { style: { position: 'absolute', inset: '27px', borderRadius: '50%', background: 'var(--surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
        React.createElement('div', { style: { fontFamily: 'var(--font-serif)', fontSize: '30px', lineHeight: 1 } }, total != null ? total : languages.length),
        React.createElement('div', { style: { color: 'var(--text-muted)', fontSize: '10.5px', letterSpacing: '.06em', textTransform: 'uppercase', marginTop: '2px' } }, 'languages'))),
    React.createElement('div', { style: { flex: 1, minWidth: '150px' } },
      languages.map((l, i) => React.createElement('div', { key: l.name, style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '14px' } },
        React.createElement('span', { style: { width: '11px', height: '11px', borderRadius: '3px', flexShrink: 0, background: l.color || PAL[i % PAL.length] } }),
        React.createElement('span', { style: { flex: 1 } }, l.name),
        React.createElement('span', { style: { color: 'var(--text-muted)' } }, Math.round(l.pct * 100) + '%'))))
  );
}
