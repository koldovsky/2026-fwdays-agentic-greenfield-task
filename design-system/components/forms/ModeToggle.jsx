import React from 'react';

export function ModeToggle({ options = ['Explore', 'Compare'], value, onChange }) {
  return React.createElement('div', { style: { display: 'inline-flex', gap: '4px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '4px' } },
    options.map((opt) => {
      const on = opt === value;
      return React.createElement('button', {
        key: opt, onClick: () => onChange && onChange(opt),
        style: { border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, padding: '9px 20px', borderRadius: '8px', transition: 'background var(--dur-fast)', background: on ? 'var(--accent-primary)' : 'transparent', color: on ? '#fff' : 'var(--text-muted)' },
      }, opt);
    })
  );
}
