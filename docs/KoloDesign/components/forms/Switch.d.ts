import React from "react";

/**
 * Compact 34×20 toggle.
 * @startingPoint section="Forms" subtitle="Compact green on/off toggle" viewport="700x90"
 */
export interface SwitchProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  style?: React.CSSProperties;
}

export function Switch(props: SwitchProps): JSX.Element;
