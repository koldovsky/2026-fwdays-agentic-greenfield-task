import React from 'react';
import { CurrencyAvatar } from './CurrencyAvatar.jsx';
import { TrendBadge } from './TrendBadge.jsx';

/**
 * RateRow — one currency line in the rates list. Leads with the number:
 * the official UAH rate in tabular mono, then the day-over-day move. Code
 * + name sit on the left. `selected` adds a brand ring; `interactive`
 * makes the whole row a calm button.
 */
export function RateRow({
  code,
  name,
  flag,
  rate,
  unit = 1,
  delta = 0,
  selected = false,
  interactive = false,
  onClick,
  style = {},
}) {
  const [hover, setHover] = React.useState(false);
  const fmtRate = Number(rate).toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => interactive && setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        padding: '12px 16px',
        background: selected ? 'var(--brand-soft)' : (interactive && hover ? 'var(--surface-hover)' : 'transparent'),
        border: `1px solid ${selected ? 'var(--brand-border)' : 'transparent'}`,
        borderRadius: 'var(--radius-md)',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'var(--transition-control)',
        ...style,
      }}
    >
      <CurrencyAvatar code={code} flag={flag} size="md" />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)',
          color: 'var(--text)', letterSpacing: '0.02em',
        }}>
          {code}
        </span>
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {unit > 1 ? `${unit} ` : ''}{name}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
          fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-md)', color: 'var(--text)',
        }}>
          {fmtRate}
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginLeft: 4 }}>₴</span>
        </span>
        <TrendBadge delta={delta} size="sm" />
      </div>
    </div>
  );
}
