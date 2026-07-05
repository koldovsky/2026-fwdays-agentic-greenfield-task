import * as React from "react";
/** Sidebar folder row with optional count, color dot, and nesting depth. */
export interface FolderItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  name: string;
  count?: number;
  /** Color dot (replaces the folder icon). */
  color?: string;
  /** Lucide icon name. @default "folder" */
  icon?: string;
  active?: boolean;
  /** Indent level for nested folders. */
  depth?: number;
}
export declare function FolderItem(props: FolderItemProps): JSX.Element;
