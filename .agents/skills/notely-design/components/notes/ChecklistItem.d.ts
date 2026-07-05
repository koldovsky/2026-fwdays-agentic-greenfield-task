import * as React from "react";
/** Checklist (to-do) row inside a note. */
export interface ChecklistItemProps extends React.HTMLAttributes<HTMLDivElement> {
  checked?: boolean;
  text?: string;
  onToggle?: () => void;
  /** Render the text as an editable input. */
  editable?: boolean;
}
export declare function ChecklistItem(props: ChecklistItemProps): JSX.Element;
