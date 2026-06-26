/**
 * Circular conic-gradient match score donut with summary headline.
 * Score color auto-adapts: green ≥70, amber 45–69, red <45.
 * FR-CHECKLIST-04
 *
 * @startingPoint section="CV-Agent" subtitle="Match score ring with headline and subtext" viewport="700x110"
 */
export interface MatchScoreProps {
  /** Score value 0–100 */
  score?: number;
  /** Summary headline (e.g. "Strong, with two honest gaps") */
  headline?: string;
  /** Secondary line (e.g. "Weighted by must-have vs nice-to-have") */
  subtext?: string;
  /** Visual size preset */
  size?: 'sm' | 'md' | 'lg';
}
