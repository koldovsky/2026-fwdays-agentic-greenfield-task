export interface ModeToggleProps {
  options?: string[];
  value: string;
  onChange?: (value: string) => void;
}
export function ModeToggle(props: ModeToggleProps): JSX.Element;
