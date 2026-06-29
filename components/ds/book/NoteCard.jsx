'use client';
import React from 'react';

/**
 * A color-coded reading note. Left highlighter spine, optional quoted
 * excerpt painted in that highlighter, your note below, plus meta.
 */
export function NoteCard({ color = 'yellow', excerpt, note, page, tags = [], links = 0, book, onClick, style }) {
  const hl = `var(--hl-${color})`;
  const mark = `var(--hl-${color}-mark)`;
  return (
    <article
      onClick={onClick}
      className={onClick ? 'bs-card-int' : undefined}
      style={{
        position: 'relative', background: 'var(--surface-card)',
        border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)', padding: '14px 16px 14px 18px',
        cursor: onClick ? 'pointer' : undefined, overflow: 'hidden',
        transition: 'transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)',
        ...style,
      }}
    >
      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: hl }} />
      {excerpt && (
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', fontStyle: 'italic',
          lineHeight: 'var(--leading-snug)', color: 'var(--text-primary)', margin: 0,
        }}>
          <span style={{ background: mark, borderRadius: 3, padding: '0.04em 0.18em', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>{excerpt}</span>
        </p>
      )}
      {note && (
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 'var(--text-base)',
          lineHeight: 'var(--leading-normal)', color: 'var(--text-secondary)',
          margin: excerpt ? '10px 0 0' : 0,
        }}>{note}</p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        {book && <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{book}</span>}
        {page != null && <span style={{ fontFamily: 'var(--font-meta)', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>p.{page}</span>}
        {links > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-meta)', fontSize: 'var(--text-xs)', color: 'var(--accent-hover)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            {links}
          </span>
        )}
        {tags.length > 0 && (
          <span style={{ display: 'inline-flex', gap: 6, marginLeft: 'auto' }}>
            {tags.map((t) => (
              <span key={t} style={{ fontFamily: 'var(--font-meta)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>#{t}</span>
            ))}
          </span>
        )}
      </div>
    </article>
  );
}