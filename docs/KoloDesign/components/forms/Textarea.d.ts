import React from "react";

/**
 * Multiline text input.
 * @startingPoint section="Forms" subtitle="Multiline textarea" viewport="700x150"
 */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  fill?: "white" | "paper";
  rows?: number;
  style?: React.CSSProperties;
}

export function Textarea(props: TextareaProps): JSX.Element;
