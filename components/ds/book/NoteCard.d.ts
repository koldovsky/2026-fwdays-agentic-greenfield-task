import * as React from 'react';
import type { HighlighterKey } from './HighlighterPicker';

/**
 * Color-coded reading note: highlighter spine + quoted excerpt + your note + meta.
 * @startingPoint section="Book" subtitle="Color-coded reading note" viewport="700x180"
 */
export interface NoteCardProps {
  /** Highlighter color key @default "yellow" */
  color?: HighlighterKey;
  /** The quoted passage (painted in the highlighter color) */
  excerpt?: string;
  /** Your own note / reflection */
  note?: string;
  /** Page reference */
  page?: number;
  /** Hashtags (without the #) */
  tags?: string[];
  /** Count of linked notes/books */
  links?: number;
  /** Source book title (shown when listed outside a book page) */
  book?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function NoteCard(props: NoteCardProps): JSX.Element;
