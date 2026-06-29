import * as React from 'react';

/** Multi-line field for notes & summaries. `ruled` paints notebook lines + serif. */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  /** Notebook ruled-line paper + serif body — for note/summary writing */
  ruled?: boolean;
}

export function Textarea(props: TextareaProps): JSX.Element;
