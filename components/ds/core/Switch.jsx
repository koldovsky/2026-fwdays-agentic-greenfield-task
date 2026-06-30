'use client';
import React from 'react';

/**
 * Switch — a calm pill toggle (e.g. the night-theme toggle). Slides,
 * never bounces. Optional trailing label.
 */
export function Switch({ checked = false, onChange, label, disabled = false, style = {} }) {
  const W = 40, H = 22, KNOB = 16, PAD = 3;
  const toggle = () => { if (!disabled && onChange) onChange(!checked); };

  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        userSelect: 'none',
        ...style,
      }}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={toggle}
        style={{
          position: 'relative',
          width: W,
          height: H,
          flex: 'none',
          padding: 0,
          border: 'none',
          borderRadius: 'var(--radius-pill)',
          background: checked ? 'var(--brand)' : 'var(--border-strong)',
          cursor: 'inherit',
          transition: 'background-color var(--dur-fast) var(--ease-out)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: PAD,
            left: checked ? W - KNOB - PAD : PAD,
            width: KNOB,
            height: KNOB,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: 'var(--shadow-sm)',
            transition: 'left var(--dur-fast) var(--ease-out)',
          }}
        />
      </button>
      {label && (
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          {label}
        </span>
      )}
    </label>
  );
}