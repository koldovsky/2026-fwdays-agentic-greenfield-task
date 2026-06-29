import * as React from 'react';

/**
 * A book on the shelf: generated/image cover, title, author, 1–10 score, meta.
 * @startingPoint section="Book" subtitle="Shelf book card" viewport="700x340"
 */
export interface BookCardProps {
  title: string;
  author?: string;
  /** Generated cover color when no image @default "ink" */
  cover?: 'blue' | 'coral' | 'teal' | 'purple' | 'amber' | 'green' | 'ink';
  /** Cover image URL (overrides generated cover) */
  coverSrc?: string;
  /** 1–10 score */
  rating?: number;
  status?: 'reading' | 'finished' | 'toread';
  /** Hashtags without # */
  tags?: string[];
  /** Note count */
  notes?: number;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function BookCard(props: BookCardProps): JSX.Element;
