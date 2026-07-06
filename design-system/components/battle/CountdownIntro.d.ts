export interface CountdownIntroProps {
  /** Current number to show; 0 (or less) shows the label instead. */
  count?: number;
  label?: string;
}
export function CountdownIntro(props: CountdownIntroProps): JSX.Element;
