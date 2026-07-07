export interface InputProps {
  value?: string;
  onChange?: (next: string) => void;
  placeholder?: string;
  /** Material Symbols icon rendered at the left. */
  icon?: string;
  error?: string;
  label?: string;
  type?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}
