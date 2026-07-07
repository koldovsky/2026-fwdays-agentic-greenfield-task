import React from 'react';

/**
 * ListRow — neomorphic row primitive for vertical picker stacks (e.g.
 * inputs modal, settings). Raised at rest, inset shadow on press, same
 * `--base-100` surface as every other neomorphic component so a stack of
 * rows sits inside its parent modal seamlessly. Extends the DS per the
 * `frontend-design-check` rule against inlining row styles at the app.
 */
export function ListRow({ label, onClick, disabled = false, trailingIcon, leadingIcon }) {
  const [pressed, setPressed] = React.useState(false);
  const isInset = pressed && !disabled;
  const shadow = isInset ? 'var(--nm-inset-sm)' : 'var(--nm-raised-sm)';
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '14px 18px',
        borderRadius: 'var(--radius-md)',
        border: 'none',
        background: 'var(--base-100)',
        boxShadow: shadow,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-body)',
        fontWeight: 600,
        color: 'var(--fg-1)',
        textAlign: 'left',
        transition: 'box-shadow 0.12s ease',
      }}
    >
      {leadingIcon && (
        <span
          className="material-symbols-rounded"
          style={{ fontSize: 22, color: 'var(--fg-2)', flexShrink: 0 }}
          aria-hidden="true"
        >
          {leadingIcon}
        </span>
      )}
      <span style={{ flex: 1 }}>{label}</span>
      {trailingIcon && (
        <span
          className="material-symbols-rounded"
          style={{ fontSize: 22, color: 'var(--fg-2)', flexShrink: 0 }}
          aria-hidden="true"
        >
          {trailingIcon}
        </span>
      )}
    </button>
  );
}
