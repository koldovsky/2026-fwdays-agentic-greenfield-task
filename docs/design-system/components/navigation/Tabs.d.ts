import * as React from 'react';

export interface TabItem { value: string; label: string; count?: number; }

/** Underline tab bar. Items may be strings or `{value,label,count}`. */
export interface TabsProps {
  items: (string | TabItem)[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
}

export function Tabs(props: TabsProps): JSX.Element;
