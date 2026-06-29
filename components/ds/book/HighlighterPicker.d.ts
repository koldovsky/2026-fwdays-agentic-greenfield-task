import * as React from 'react';

export type HighlighterKey = 'yellow' | 'amber' | 'coral' | 'pink' | 'purple' | 'blue' | 'teal' | 'green';

/** Row of highlighter color swatches for tagging a note's color. */
export interface HighlighterPickerProps {
  value?: HighlighterKey;
  onChange?: (key: HighlighterKey) => void;
  /** @default "md" */
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

export function HighlighterPicker(props: HighlighterPickerProps): JSX.Element;
export const HIGHLIGHTER_KEYS: HighlighterKey[];
