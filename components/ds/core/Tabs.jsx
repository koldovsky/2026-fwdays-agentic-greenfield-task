'use client';
import React from 'react';

/**
 * Tabs — a segmented control for switching views (Курси / Конвертер /
 * Історія). Pill track, brand-filled active segment. Calm, no bounce.
 */
export function Tabs({ tabs = [], value, onChange, size = 'md', style = {} }) {
  const pad = size === 'sm' ? '5px 12px' : '7px 16px';
  const fs = size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)';

  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        gap: 2,
        padding: 3,
        background: 'var(--surface-sunken)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-pill)',
        ...style,
      }}
    >
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange && onChange(t.value)}
            style={{
              padding: pad,
              border: 'none',
              borderRadius: 'var(--radius-pill)',
              background: active ? 'var(--brand)' : 'transparent',
              color: active ? 'var(--text-on-brand)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-sans)',
              fontSize: fs,
              fontWeight: 'var(--weight-semibold)',
              lineHeight: 1,
              cursor: 'pointer',
              boxShadow: active ? 'var(--shadow-xs)' : 'none',
              transition: 'var(--transition-control)',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}