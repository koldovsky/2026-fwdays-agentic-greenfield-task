import React from 'react';

/* Calm, explicit rate-limit state (FR-DATA-05). Never a crash or blank. */
export function RateLimitCard({ title = 'GitHub rate limit reached', detail = "GitHub's unauthenticated API allows 60 requests per hour per IP. Wait a little, then try again.", onRetry }) {
  return React.createElement('div', { style: { margin: '60px auto', maxWidth: 520, textAlign: 'center', padding: '34px', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', background: 'var(--surface)', fontFamily: 'var(--font-sans)' } },
    React.createElement('div', { style: { fontFamily: 'var(--font-serif)', fontSize: 24, marginBottom: 8 } }, title),
    React.createElement('div', { style: { color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 } }, detail),
    onRetry ? React.createElement('button', { onClick: onRetry, style: { marginTop: 20, border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14, padding: '11px 22px', borderRadius: 'var(--radius-md)', background: 'transparent', color: 'var(--text)' } }, 'Try again') : null
  );
}
