export interface ReachBarProps {
  label: string;
  value: number;
  /** Preformatted display value; defaults to value. */
  valueFmt?: string;
  /** Max in the group, used to size the bar. */
  max: number;
}
export function ReachBar(props: ReachBarProps): JSX.Element;
