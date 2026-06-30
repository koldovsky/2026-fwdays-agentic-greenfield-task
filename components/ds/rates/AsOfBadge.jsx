'use client';
import React from 'react';
import { Icon } from '../core/Icon.jsx';

/**
 * AsOfBadge — honest provenance line. States the effective date and that
 * the figure is the official NBU rate. When `stale` (weekend / holiday),
 * it says so plainly rather than pretending the number is "today".
 */
export function AsOfBadge({ date, stale = false, source = 'НБУ', style = {} }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        height: 24,
        padding: '0 10px 0 9px',
        borderRadius: 'var(--radius-pill)',
        background: stale ? 'var(--accent-soft)' : 'var(--surface-sunken)',
        border: `1px solid ${stale ? 'var(--brass-200)' : 'var(--border)'}`,
        color: stale ? 'var(--accent-strong)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-medium)',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <Icon name={stale ? 'info' : 'circle-check'} size={13} />
      <span>
        {stale ? 'Курс за ' : 'Станом на '}
        <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{date}</span>
        {' · '}
        <span style={{ color: 'var(--text-muted)' }}>офіційний курс {source}</span>
      </span>
    </span>
  );
}