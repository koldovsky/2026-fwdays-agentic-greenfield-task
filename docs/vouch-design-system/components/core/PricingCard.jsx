import React from 'react';

/**
 * Pricing tier card — three variants: Free, Pro (featured/dark), Job-hunt Pass.
 * FR-SALES-03
 */
export function PricingCard({
  tier = 'Free',
  price,
  period,
  features = [],
  cta = 'Get started',
  featured = false,
}) {
  return (
    <div
      style={{
        background: featured ? 'var(--color-ink)' : 'var(--color-surface-card)',
        border: featured ? 'none' : '1px solid var(--color-hairline)',
        borderRadius: 'var(--radius-2xl)',
        padding: 'var(--space-7)',
        position: 'relative',
        fontFamily: 'var(--font-body)',
        color: featured ? '#f4f6fa' : 'var(--color-ink)',
        boxShadow: featured ? 'var(--shadow-ink)' : 'none',
      }}
    >
      {featured && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: 'var(--tracking-wide)',
            textTransform: 'uppercase',
            color: 'var(--color-ink)',
            background: 'var(--color-brand-wash)',
            padding: '3px 8px',
            borderRadius: '6px',
          }}
        >
          Popular
        </div>
      )}

      <div style={{ fontWeight: 600, fontSize: 'var(--text-md)', marginBottom: 'var(--space-1)' }}>
        {tier}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '5px',
          marginBottom: 'var(--space-4)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '36px',
            lineHeight: 1,
          }}
        >
          {price}
        </span>
        {period && (
          <span
            style={{
              color: featured ? '#8fa6d6' : 'var(--color-ink-muted)',
              fontSize: 'var(--text-base)',
            }}
          >
            {period}
          </span>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {features.map((f, i) => {
          const item = typeof f === 'string' ? { label: f, muted: false } : f;
          return (
            <div
              key={i}
              style={{
                fontSize: 'var(--text-base)',
                color: featured
                  ? item.muted ? '#617b9a' : '#c4d0e6'
                  : item.muted ? '#aab2bf' : 'var(--color-ink-soft)',
              }}
            >
              {item.label}
            </div>
          );
        })}
      </div>

      <div
        style={{
          textAlign: 'center',
          background: featured ? 'var(--color-brand)' : 'transparent',
          border: featured ? 'none' : '1px solid var(--color-hairline)',
          color: featured ? '#fff' : 'var(--color-ink)',
          fontWeight: 600,
          fontSize: '14.5px',
          padding: '11px',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
        }}
      >
        {cta}
      </div>
    </div>
  );
}
