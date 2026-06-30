import React from "react";

export interface TabItem {
  value: string;
  label: string;
  /** Icon node (e.g. a Lucide <i> or SVG). */
  icon: React.ReactNode;
}

export interface TabBarProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange"> {
  items: TabItem[];
  value: string;
  onChange?: (value: string) => void;
}

/** iOS bottom tab bar with blurred material; active tab is amber. */
export function TabBar(props: TabBarProps): JSX.Element;
