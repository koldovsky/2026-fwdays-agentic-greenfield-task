import React from 'react';
import { Icon } from './Icon.jsx';

/**
 * Chip — a compact, pill-shaped selector / token. Used for quick currency
 * filters and removable selections. `active` fills with a green tint and
 * brand border; `onRemove` adds a trailing × control.
 */
export function Chip({ children, icon, active = false, onClick, onRemove, style = {} }) {
  const [hover, setHover] = React.useState(false);

  return (
    <span
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 30,
        padding: onRemove ? '0 6px 0 12px' : '0 12px',
        borderRadius: 'var(--radius-pill)',
        background: active ? 'var(--brand-soft)' : (hover ? 'var(--surface-hover)' : 'var(--surface)'),
        border: `1px solid ${active ? 'var(--brand-border)' : 'var(--border)'}`,
        color: active ? 'var(--brand)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--weight-medium)',
        lineHeight: 1,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'var(--transition-control)',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={15} />}
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label="Прибрати"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18, height: 18,
            marginLeft: 1,
            padding: 0,
            border: 'none',
            borderRadius: '50%',
            background: 'transparent',
            color: 'inherit',
            cursor: 'pointer',
            opacity: 0.7,
          }}
        >
          <Icon name="x" size={13} />
        </button>
      )}
    </span>
  );
}
