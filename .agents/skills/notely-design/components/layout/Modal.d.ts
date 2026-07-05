import * as React from "react";
/** Centered modal dialog with backdrop. */
export interface ModalProps {
  open: boolean;
  title?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  onClose?: () => void;
}
export declare function Modal(props: ModalProps): JSX.Element | null;
