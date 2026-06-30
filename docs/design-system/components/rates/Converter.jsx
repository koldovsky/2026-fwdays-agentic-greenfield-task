import React from 'react';
import { Input } from '../core/Input.jsx';
import { IconButton } from '../core/IconButton.jsx';

/**
 * Converter — UAH ⇄ foreign currency at the official rate. Two mono
 * fields with the rate between them; the swap control flips direction.
 * Locale-aware: accepts "100,50" and trailing zeros. Controlled via
 * `amount` + `direction`, or self-managing if those are omitted.
 */
function parseAmount(raw) {
  if (raw == null) return 0;
  const cleaned = String(raw).replace(/\s/g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

const fmt = (n) => n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function Converter({ code = 'USD', rate = 1, defaultAmount = '100', style = {} }) {
  const [amount, setAmount] = React.useState(defaultAmount);
  // direction: 'uah-to-foreign' means the typed amount is UAH
  const [direction, setDirection] = React.useState('foreign-to-uah');
  const value = parseAmount(amount);
  const fromForeign = direction === 'foreign-to-uah';
  const result = fromForeign ? value * rate : (rate ? value / rate : 0);

  const fromUnit = fromForeign ? code : '₴';
  const toUnit = fromForeign ? '₴' : code;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, ...style }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
          {fromForeign ? `Сума у ${code}` : 'Сума у гривнях'}
        </label>
        <Input
          mono align="right" size="lg" suffix={fromUnit}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <IconButton
          icon="arrow-down-up"
          label="Поміняти напрям"
          variant="soft"
          onClick={() => setDirection((d) => d === 'foreign-to-uah' ? 'uah-to-foreign' : 'foreign-to-uah')}
        />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          1 {code} = <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{fmt(rate)} ₴</span>
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
          {fromForeign ? 'Це у гривнях' : `Це у ${code}`}
        </label>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 8,
          height: 'var(--control-h-lg)', padding: '0 14px',
          background: 'var(--brand-soft)', border: '1px solid var(--brand-border)',
          borderRadius: 'var(--radius-md)',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
            fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-lg)', color: 'var(--brand)',
          }}>
            {fmt(result)}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--brand)', opacity: 0.7 }}>
            {toUnit}
          </span>
        </div>
      </div>
    </div>
  );
}
