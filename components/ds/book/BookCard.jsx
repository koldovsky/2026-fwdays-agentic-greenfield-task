'use client';
import React from 'react';
import { Rating } from './Rating';

const COVER_BG = {
  blue:   'linear-gradient(160deg, #3a4fe0, #242fa3)',
  coral:  'linear-gradient(160deg, #ff6f5e, #d8463a)',
  teal:   'linear-gradient(160deg, #3ccfbf, #1f8f82)',
  purple: 'linear-gradient(160deg, #b083f5, #7a4fd0)',
  amber:  'linear-gradient(160deg, #ffaf45, #d98a23)',
  green:  'linear-gradient(160deg, #7fd96f, #45a83a)',
  ink:    'linear-gradient(160deg, #4b4334, #2a2419)',
};

const STATUS = {
  reading:  { label: 'Reading', tone: 'var(--accent)', bg: 'var(--accent-soft)', fg: 'var(--accent-hover)' },
  finished: { label: 'Finished', tone: 'var(--success)', bg: 'var(--success-soft)', fg: 'var(--success)' },
  toread:   { label: 'To read', tone: 'var(--ink-4)', bg: 'var(--surface-sunken)', fg: 'var(--text-muted)' },
};

/** A book on the shelf — generated cover (or image), title, author, score, meta. */
export function BookCard({
  title, author, cover = 'ink', coverSrc, rating, status, tags = [], notes, onClick, style,
}) {
  const st = status ? STATUS[status] : null;
  return (
    <article
      onClick={onClick}
      className={onClick ? 'bs-card-int' : undefined}
      style={{
        display: 'flex', flexDirection: 'column', gap: 12,
        background: 'var(--surface-card)', border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', padding: 14,
        cursor: onClick ? 'pointer' : undefined, width: 200,
        transition: 'transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)',
        ...style,
      }}
    >
      {/* cover */}
      <div style={{
        position: 'relative', aspectRatio: '3 / 4', borderRadius: 'var(--radius-sm)',
        overflow: 'hidden', boxShadow: 'var(--shadow-md)',
        background: coverSrc ? 'var(--surface-sunken)' : (COVER_BG[cover] || COVER_BG.ink),
      }}>
        {coverSrc
          ? <img src={coverSrc} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 14 }}>
              <span style={{ width: 22, height: 3, borderRadius: 2, background: '#ffffff66' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18, lineHeight: 1.12, color: '#fff', letterSpacing: '-0.01em' }}>{title}</span>
            </div>
          )}
        {st && (
          <span style={{
            position: 'absolute', top: 8, right: 8, fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)',
            color: st.fg, background: st.bg, borderRadius: 'var(--radius-full)', padding: '2px 8px',
          }}>{st.label}</span>
        )}
      </div>

      {/* meta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 600, lineHeight: 1.15, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
        {author && <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{author}</span>}
      </div>

      {rating != null && <Rating value={rating} readOnly size="sm" />}

      {(tags.length > 0 || notes != null) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
          {tags.slice(0, 2).map((t) => (
            <span key={t} style={{ fontFamily: 'var(--font-meta)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>#{t}</span>
          ))}
          {notes != null && (
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-meta)', fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>{notes} notes</span>
          )}
        </div>
      )}
    </article>
  );
}