import * as React from "react";
/**
 * Rich-text formatting toolbar for the note editor.
 * @startingPoint section="Notes" subtitle="Editor formatting bar" viewport="700x60"
 */
export interface EditorToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Map of active formats, e.g. { bold: true, "heading-1": true }. */
  active?: Record<string, boolean>;
  /** Called with the Lucide action name when a control is pressed. */
  onAction?: (action: string) => void;
}
export declare function EditorToolbar(props: EditorToolbarProps): JSX.Element;
