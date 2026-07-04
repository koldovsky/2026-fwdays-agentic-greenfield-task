import React from 'react';
import { IconButton } from '../core/IconButton.jsx';

/**
 * DPad — the signature remote-control primitive: a circular neumorphic
 * housing with four directional arrows around a central OK button.
 * The housing itself is a large inset ring so the raised arrow buttons
 * read as resting inside a carved dish.
 */
export function DPad({ onDirection, onSelect, size = 220, disabled = false }) {
  const cell = size / 3;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--base-100)',
        boxShadow: 'var(--nm-inset-md)',
        display: 'grid',
        gridTemplateColumns: `repeat(3, ${cell}px)`,
        gridTemplateRows: `repeat(3, ${cell}px)`,
        placeItems: 'center',
        padding: 10,
        boxSizing: 'content-box',
      }}
    >
      <div />
      <IconButton icon="keyboard_arrow_up" size="md" disabled={disabled} onClick={() => onDirection && onDirection('up')} aria-label="Up" />
      <div />
      <IconButton icon="keyboard_arrow_left" size="md" disabled={disabled} onClick={() => onDirection && onDirection('left')} aria-label="Left" />
      <IconButton icon="fiber_manual_record" size="md" tone="accent" disabled={disabled} onClick={onSelect} aria-label="Select" style={{ fontSize: 10 }} />
      <IconButton icon="keyboard_arrow_right" size="md" disabled={disabled} onClick={() => onDirection && onDirection('right')} aria-label="Right" />
      <div />
      <IconButton icon="keyboard_arrow_down" size="md" disabled={disabled} onClick={() => onDirection && onDirection('down')} aria-label="Down" />
      <div />
    </div>
  );
}
