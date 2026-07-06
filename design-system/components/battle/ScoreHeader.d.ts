export interface ScoreHeaderProps {
  nameA: string; nameB: string;
  avatarA?: string; avatarB?: string;
  scoreA?: number; scoreB?: number;
}
/**
 * @startingPoint section="Battle" subtitle="Versus header with live score" viewport="700x220"
 */
export function ScoreHeader(props: ScoreHeaderProps): JSX.Element;
