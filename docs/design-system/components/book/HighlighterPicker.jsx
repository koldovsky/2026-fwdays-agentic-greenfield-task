import React from 'react';

const HIGHLIGHTS = [
  { key: 'yellow', color: 'var(--hl-yellow)' },
  { key: 'amber',  color: 'var(--hl-amber)' },
  { key: 'coral',  color: 'var(--hl-coral)' },
  { key: 'pink',   color: 'var(--hl-pink)' },
  { key: 'purple', color: 'var(--hl-purple)' },
  { key: 'blue',   color: 'var(--hl-blue)' },
  { key: 'teal',   color: 'var(--hl-teal)' },
  { key: 'green',  color: 'var(--hl-green)' },
];

/** Row of highlighter swatches for choosing a note color. */
export function HighlighterPicker({ value, onChange, size = 'md', style }) {
  const d = size === 'sm' ? 22 : 28;
  return (
    <div role="radiogroup" style={{ display: 'inline-flex', gap: 8, ...style }}>
      {HIGHLIGHTS.map(({ key, color }) => {
        const on = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={key}
            title={key}
            onClick={() => onChange && onChange(key)}
            style={{
              width: d, height: d, padding: 0, borderRadius: '50%',
              background: color, cursor: 'pointer',
              border: '2px solid ' + (on ? 'var(--text-primary)' : 'transparent'),
              boxShadow: on ? 'var(--shadow-sm)' : 'inset 0 0 0 1px #00000014',
              outline: 'none', transform: on ? 'scale(1.06)' : 'none',
              transition: 'transform var(--dur-fast) var(--ease-spring), border-color var(--dur-fast) var(--ease-out)',
            }}
          />
        );
      })}
    </div>
  );
}

export const HIGHLIGHTER_KEYS = HIGHLIGHTS.map((h) => h.key);
