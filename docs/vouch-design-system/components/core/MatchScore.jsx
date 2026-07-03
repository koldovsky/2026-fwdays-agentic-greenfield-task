import React from 'react';

/**
 * Circular match score donut with inline headline and subtext.
 * Color adapts automatically: green ≥70, amber 45–69, red <45.
 * FR-CHECKLIST-04
 */
export function MatchScore({ score = 76, headline, subtext, size = 'md' }) {
  const pct = Math.min(100, Math.max(0, score));

  const color =
    pct >= 70
      ? 'var(--color-met)'
      : pct >= 45
      ? 'var(--color-partial)'
      : 'var(--color-gap)';

  const sizes = {
    sm: { outer: 72,  inner: 56,  num: 22, sub: 9  },
    md: { outer: 88,  inner: 68,  num: 28, sub: 9  },
    lg: { outer: 96,  inner: 74,  num: 30, sub: 10 },
  };

  const d = sizes[size] || sizes.md;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-5)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: d.outer,
          height: d.outer,
          borderRadius: '50%',
          background: `conic-gradient(${color} 0 ${pct}%, #eef0f3 ${pct}% 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: d.inner,
            height: d.inner,
            borderRadius: '50%',
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: d.num,
              lineHeight: 1,
              color: 'var(--color-ink)',
            }}
          >
            {score}
          </span>
          <span
            style={{
              fontSize: d.sub,
              color: 'var(--color-ink-muted)',
              letterSpacing: '0.04em',
              marginTop: '2px',
            }}
          >
            / 100
          </span>
        </div>
      </div>

      {(headline || subtext) && (
        <div>
          {headline && (
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: size === 'sm' ? '16px' : '21px',
                color: 'var(--color-ink)',
                marginBottom: subtext ? '3px' : 0,
                lineHeight: 1.15,
              }}
            >
              {headline}
            </div>
          )}
          {subtext && (
            <div
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-ink-soft)',
                lineHeight: 1.4,
              }}
            >
              {subtext}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
