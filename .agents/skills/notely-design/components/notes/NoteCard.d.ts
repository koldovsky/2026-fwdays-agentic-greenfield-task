import * as React from "react";
export type NoteTag = string | { label: string; color?: string };
/**
 * Note preview tile for grid or list layouts.
 * @startingPoint section="Notes" subtitle="Note preview card" viewport="320x200"
 */
export interface NoteCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: string;
  /** Pre-sanitized HTML (e.g. rendered Markdown) — rendered via dangerouslySetInnerHTML, never raw/untrusted content. */
  snippet?: string;
  date?: string;
  folder?: string;
  tags?: NoteTag[];
  pinned?: boolean;
  favorite?: boolean;
  /** Accent color dot/bar (list layout). */
  color?: string;
  selected?: boolean;
  layout?: "grid" | "list";
  onTogglePin?: () => void;
  onToggleFavorite?: () => void;
}
export declare function NoteCard(props: NoteCardProps): JSX.Element;
