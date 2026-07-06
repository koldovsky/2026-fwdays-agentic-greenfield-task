export interface UsernameInputProps {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  /** Inline error message; when set, the border turns danger-red. */
  error?: string;
  onSubmit?: () => void;
}
export function UsernameInput(props: UsernameInputProps): JSX.Element;
