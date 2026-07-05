import * as React from "react";
/** Removable label for note tags, with optional color dot. */
export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Color dot hex/var shown before the label. */
  color?: string;
  removable?: boolean;
  onRemove?: () => void;
}
export declare function Tag(props: TagProps): JSX.Element;
