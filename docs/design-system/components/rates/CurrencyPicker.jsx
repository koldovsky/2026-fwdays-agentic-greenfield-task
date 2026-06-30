import React from 'react';
import { Input } from '../core/Input.jsx';
import { RateRow } from './RateRow.jsx';

/**
 * CurrencyPicker — a free-form filter over the currency list. Type to
 * narrow by code or Ukrainian name; pick a row to focus it. Shows a calm
 * inline "не знайдено" when nothing matches. Composes Input + RateRow.
 */
export function CurrencyPicker({
  currencies = [],
  selected,
  onSelect,
  query: controlledQuery,
  onQueryChange,
  maxHeight = 320,
  style = {},
}) {
  const [internalQuery, setInternalQuery] = React.useState('');
  const query = controlledQuery != null ? controlledQuery : internalQuery;
  const setQuery = (v) => { onQueryChange ? onQueryChange(v) : setInternalQuery(v); };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? currencies.filter((c) =>
        c.code.toLowerCase().includes(q) || (c.name || '').toLowerCase().includes(q))
    : currencies;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, ...style }}>
      <Input
        icon="search"
        placeholder="Знайдіть валюту — код або назва"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        size="lg"
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: '24px 16px', textAlign: 'center',
            fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)',
          }}>
            Не знайдено — спробуйте інший код
          </div>
        ) : (
          filtered.map((c) => (
            <RateRow
              key={c.code}
              code={c.code}
              name={c.name}
              flag={c.flag}
              rate={c.rate}
              unit={c.unit}
              delta={c.delta}
              interactive
              selected={c.code === selected}
              onClick={() => onSelect && onSelect(c.code)}
            />
          ))
        )}
      </div>
    </div>
  );
}
