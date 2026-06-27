import React from "react";

/**
 * Sidebar nav item.
 * @startingPoint section="Navigation" subtitle="Sidebar item with active state" viewport="700x120"
 */
export interface NavItemProps {
  children: React.ReactNode;
  /** A 16px Lucide stroke icon (currentColor). */
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function NavItem(props: NavItemProps): JSX.Element;
