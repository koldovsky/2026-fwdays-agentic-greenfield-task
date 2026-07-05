import * as React from "react";

/** Square, icon-only button. Requires an accessible `label`. */
export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  /** Icon node (e.g. a Lucide <i data-lucide="…" />). */
  icon?: React.ReactNode;
  /** Accessible label — sets aria-label and title. Required. */
  label: string;
  /** @default "ghost" */
  variant?: "ghost" | "solid" | "outline";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Toggled / selected state (ghost only). @default false */
  active?: boolean;
}

export declare function IconButton(props: IconButtonProps): JSX.Element;
