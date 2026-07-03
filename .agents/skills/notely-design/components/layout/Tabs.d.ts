import * as React from "react";
export type TabItem = string | { value: string; label: React.ReactNode; icon?: React.ReactNode; count?: number };
/** Underline tab bar. */
export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  tabs: TabItem[];
  value: string;
  onChange?: (value: string) => void;
}
export declare function Tabs(props: TabsProps): JSX.Element;
