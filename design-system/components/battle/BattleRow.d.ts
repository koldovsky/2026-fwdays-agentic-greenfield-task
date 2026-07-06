export interface BattleRowProps {
  label: string;
  aValue: string | number;
  bValue: string | number;
  /** Which side wins this metric; omit / 'draw' highlights neither. */
  winner?: 'a' | 'b' | 'draw';
}
export function BattleRow(props: BattleRowProps): JSX.Element;
