export interface ConfettiProps {
  /** Number of confetti pieces. */
  count?: number;
  /** Render only while true; flip to false to stop. */
  active?: boolean;
  /** Optional custom color list; defaults to the two brand accents + language hues. */
  colors?: string[];
}
export function Confetti(props: ConfettiProps): JSX.Element | null;
