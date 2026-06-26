/**
 * Priority tag for checklist requirement rows.
 * Renders "must" in brand blue or "nice" in muted grey.
 */
export interface BadgeProps {
  /** Priority level — controls color scheme */
  priority?: 'must' | 'nice';
}
