import React from 'react';

const sizeMap = { sm: 40, md: 52, lg: 68 };

/**
 * IconButton — circular neumorphic button for glyph-only actions:
 * D-pad arrows, power, volume, mute, home. Raised by default, inverts
 * to inset on press. `tone="accent"` for the power button / primary glyph.
 */
export function IconButton({
  icon,
  size = 'md',
  tone = 'default',
  active = false,
  disabled = false,
  onClick,
  'aria-label': ariaLabel,
  style,
}) {
  const [pressed, setPressed] = React.useState(false);
  const px = sizeMap[size] || sizeMap.md;
  const isInset = pressed || active;

  const accent = tone === 'accent';
  const danger = tone === 'danger';

  const bg = accent
    ? 'linear-gradient(145deg, var(--accent), var(--accent-strong))'
    : danger
    ? 'linear-gradient(145deg, var(--offline), #a8443d)'
    : 'var(--base-100)';

  const color = accent || danger ? 'var(--fg-on-accent)' : 'var(--fg-1)';
  const shadow = accent
    ? (isInset ? 'var(--nm-inset-md)' : 'var(--nm-raised-accent)')
    : (isInset ? 'var(--nm-inset-md)' : 'var(--nm-raised-md)');

  return (
    <button
      aria-label={ariaLabel || icon}
      disabled={disabled}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onClick={disabled ? undefined : onClick}
      style={{
        width: px,
        height: px,
        borderRadius: 'var(--radius-full)',
        border: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        color,
        boxShadow: shadow,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'box-shadow 0.12s ease, transform 0.08s ease',
        transform: isInset ? 'scale(0.96)' : 'scale(1)',
        flexShrink: 0,
        ...style,
      }}
    >
      <span className="material-symbols-rounded" style={{ fontSize: px * 0.42 }}>{icon}</span>
    </button>
  );
}
