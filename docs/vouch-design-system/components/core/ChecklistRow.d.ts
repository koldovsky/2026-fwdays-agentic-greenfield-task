/**
 * Single requirement row in the CV-Agent compliance checklist.
 * Displays requirement title, must/nice badge, one-sentence rationale,
 * and a right-aligned status label with colored dot.
 * FR-CHECKLIST-02
 *
 * @startingPoint section="CV-Agent" subtitle="Compliance checklist row — met / partial / gap / overclaim" viewport="700x80"
 */
export interface ChecklistRowProps {
  /** Requirement title (e.g. "5+ years React") */
  requirement: string;
  /** Priority level */
  priority?: 'must' | 'nice';
  /** Grounding / compliance status */
  status?: 'met' | 'partial' | 'gap' | 'overclaim';
  /** One-sentence plain-language rationale */
  rationale?: string;
  /** Set true on the final row to suppress bottom border */
  last?: boolean;
}
