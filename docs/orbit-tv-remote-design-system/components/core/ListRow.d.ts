export interface ListRowProps {
  /** Displayed text on the row. */
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Optional right-side glyph (Material Symbols Rounded name). */
  trailingIcon?: string;
  /** Optional left-side glyph (Material Symbols Rounded name). */
  leadingIcon?: string;
}
