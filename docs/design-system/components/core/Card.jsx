import React from 'react';

/**
 * Card — the brand's surface primitive. Warm-white surface, 1px calm
 * border, 14px radius, low shadow. `interactive` lifts 2px on hover;
 * `selected` adds a brand ring. No coloured left-borders, no gradients.
 */
export function Card({
  children,
  interactive = false,
  selected = false,
  padding = 'var(--space-5)',
  onClick,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => interactive && setHover(false)}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${selected ? 'var(--brand)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        boxShadow: selected
          ? '0 0 0 1px var(--brand), var(--shadow-sm)'
          : (interactive && hover ? 'var(--shadow-md)' : 'var(--shadow-sm)'),
        padding,
        cursor: interactive ? 'pointer' : 'default',
        transform: interactive && hover ? 'translateY(-2px)' : 'none',
        transition: 'var(--transition-control)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
