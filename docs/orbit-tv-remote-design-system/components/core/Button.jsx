import React from 'react';

const sizes = {
  md: { padding: '12px 22px', fontSize: 'var(--text-body)', gap: 8 },
  lg: { padding: '15px 28px', fontSize: 'var(--text-body-lg)', gap: 10 },
  sm: { padding: '9px 16px', fontSize: 'var(--text-body-sm)', gap: 6 },
};

function variantStyle(variant, pressed) {
  switch (variant) {
    case 'primary':
      return {
        background: pressed
          ? 'linear-gradient(145deg, var(--accent-strong), var(--accent))'
          : 'linear-gradient(145deg, var(--accent), var(--accent-strong))',
        color: 'var(--fg-on-accent)',
        boxShadow: pressed ? 'var(--nm-inset-sm)' : 'var(--nm-raised-accent)',
        border: 'none',
      };
    case 'ghost':
      return {
        background: 'transparent',
        color: 'var(--fg-2)',
        boxShadow: 'none',
        border: '1px solid var(--hairline)',
      };
    case 'secondary':
    default:
      return {
        background: 'var(--base-100)',
        color: 'var(--fg-1)',
        boxShadow: pressed ? 'var(--nm-inset-sm)' : 'var(--nm-raised-sm)',
        border: 'none',
      };
  }
}

/**
 * Button — the primary tappable action. Neumorphic raised surface that
 * inverts to an inset shadow on press. Primary variant carries the warm
 * accent gradient for the single most important action on a screen
 * (e.g. "Add TV", "Confirm"); secondary is the flat neumorphic default;
 * ghost is a bordered, shadowless option for low-emphasis actions.
 */
export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  disabled = false,
  icon = null,
  onClick,
  style,
  ...rest
}) {
  const [pressed, setPressed] = React.useState(false);
  const sizeStyle = sizes[size] || sizes.md;
  const vStyle = variantStyle(variant, pressed);

  return (
    <button
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        fontFamily: 'var(--font-sans)',
        fontWeight: 'var(--weight-semibold)',
        fontSize: sizeStyle.fontSize,
        padding: sizeStyle.padding,
        borderRadius: 'var(--radius-md)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: sizeStyle.gap,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'box-shadow 0.12s ease, transform 0.08s ease',
        transform: pressed ? 'scale(0.98)' : 'scale(1)',
        outline: 'none',
        ...vStyle,
        ...style,
      }}
      {...rest}
    >
      {icon && <span className="material-symbols-rounded" style={{ fontSize: '1.15em' }}>{icon}</span>}
      {children}
    </button>
  );
}
