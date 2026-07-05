import * as React from "react";

/** Search input with leading icon, clear button, and optional keyboard hint. */
export interface SearchFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Keyboard hint shown at the right when empty, e.g. "⌘K". */
  shortcut?: string;
  /** Called when the clear (×) button is pressed. */
  onClear?: () => void;
}

export declare function SearchField(props: SearchFieldProps): JSX.Element;
