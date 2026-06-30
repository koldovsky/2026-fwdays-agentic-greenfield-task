import * as React from 'react';

export interface TabItem {
  value: string;
  label: string;
}

/** Props for the segmented control. */
export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange?: (value: string) => void;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

/** A segmented pill control for switching views. */
export function Tabs(props: TabsProps): JSX.Element;
