import React from 'react';
import { IconButton } from '../core/IconButton.jsx';

const toneMap = {
  info: { band: 'var(--connecting)', icon: 'info' },
  warning: { band: 'var(--connecting)', icon: 'warning' },
  error: { band: 'var(--offline)', icon: 'error' },
};

/**
 * Toast — transient, non-modal feedback surface. Raised neomorphic card
 * on the shared `--base-100` surface with a solid tone-coloured left band
 * (using the same status tokens `Badge` uses) plus a Material Symbols
 * glyph and a dismiss `IconButton`. Consumed by the SPA's `ToastHost`;
 * intended for one-line messages of ≤ ~2 lines wrapped copy.
 */
export function Toast({
  tone = 'info',
  icon,
  children,
  onDismiss,
  onMouseEnter,
  onMouseLeave,
}) {
  const cfg = toneMap[tone] || toneMap.info;
  const glyph = icon || cfg.icon;
  return (
    <div
      role="status"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        minWidth: 280,
        maxWidth: 420,
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--base-100)',
        boxShadow: 'var(--nm-raised-md)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans)',
        color: 'var(--fg-1)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 4,
          background: cfg.band,
        }}
      />
      <span
        className="material-symbols-rounded"
        aria-hidden="true"
        style={{ fontSize: 22, color: cfg.band, flexShrink: 0, marginLeft: 'var(--space-1)' }}
      >
        {glyph}
      </span>
      <div
        style={{
          flex: 1,
          fontSize: 'var(--text-body)',
          fontWeight: 'var(--weight-medium)',
          lineHeight: 1.35,
        }}
      >
        {children}
      </div>
      {onDismiss && (
        <IconButton
          icon="close"
          size="sm"
          onClick={onDismiss}
          aria-label="Dismiss"
        />
      )}
    </div>
  );
}
