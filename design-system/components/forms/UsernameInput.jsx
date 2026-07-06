import React from 'react';

export function UsernameInput({ value, onChange, placeholder = 'GitHub username', error = '', onSubmit }) {
  const borderColor = error ? 'var(--accent-danger)' : 'var(--border)';
  return React.createElement('div', { style: { width: '100%' } },
    React.createElement('input', {
      value, placeholder,
      onChange: (e) => onChange && onChange(e.target.value),
      onKeyDown: (e) => { if (e.key === 'Enter' && onSubmit) onSubmit(); },
      style: { width: '100%', padding: '13px 15px', fontSize: '15px', fontFamily: 'var(--font-sans)', background: 'var(--surface)', color: 'var(--text)', border: '1.5px solid ' + borderColor, borderRadius: 'var(--radius-md)', outline: 'none' },
    }),
    error ? React.createElement('div', { style: { color: 'var(--accent-danger)', fontSize: '12.5px', marginTop: '6px', fontFamily: 'var(--font-sans)' } }, error) : null
  );
}
