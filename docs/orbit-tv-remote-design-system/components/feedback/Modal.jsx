import React from 'react';
import { IconButton } from '../core/IconButton.jsx';

/**
 * Modal — centered neumorphic dialog on a translucent scrim. Used for
 * the "Add TV by IP" flow. Contains its own raised close button.
 */
export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(30, 34, 40, 0.35)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--base-100)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--nm-raised-lg)',
          padding: 'var(--space-8)',
          width: 380,
          maxWidth: '90vw',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--text-h2)', fontWeight: 'var(--weight-bold)', color: 'var(--fg-1)' }}>
            {title}
          </h2>
          <IconButton icon="close" size="sm" onClick={onClose} aria-label="Close" />
        </div>
        {children}
        {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>{footer}</div>}
      </div>
    </div>
  );
}
