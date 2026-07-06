import React from 'react';

/**
 * Input — neumorphic inset text field. Used for entering a TV's IP
 * address when pairing manually. Optional leading icon and helper/error text.
 */
export function Input({
  value,
  onChange,
  placeholder,
  icon,
  error,
  label,
  type = 'text',
  disabled = false,
  style,
}) {
  return (
    <label
      aria-disabled={disabled}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: '100%',
        opacity: disabled ? 0.55 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      {label && (
        <span
          style={{
            fontSize: 'var(--text-caption)',
            fontWeight: 'var(--weight-semibold)',
            letterSpacing: 'var(--tracking-overline)',
            textTransform: 'uppercase',
            color: 'var(--fg-3)',
          }}
        >
          {label}
        </span>
      )}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '13px 18px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--base-100)',
          boxShadow: error ? '0 0 0 2px var(--offline)' : 'var(--nm-inset-md)',
          ...style,
        }}
      >
        {icon && (
          <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--fg-3)' }}>
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            font: 'inherit',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-body)',
            color: 'var(--fg-1)',
            width: '100%',
          }}
        />
      </span>
      {error && (
        <span style={{ fontSize: 'var(--text-body-sm)', color: 'var(--offline)' }}>{error}</span>
      )}
    </label>
  );
}
