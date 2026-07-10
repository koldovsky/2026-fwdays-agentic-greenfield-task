/**
 * Grounding status pill shown beneath each tailored CV bullet.
 * FR-BULLETS-01 (grounded), FR-BULLETS-02 (overclaim), FR-EDIT-02 (manual edit).
 */
export interface GroundingBadgeProps {
  /** Grounding result */
  status?: 'met' | 'partial' | 'overclaim' | 'manual';
  /** Override the default label for this status */
  label?: string;
}
