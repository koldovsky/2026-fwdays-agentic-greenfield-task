import React from "react";

export interface InsightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card heading. @default "Daily insight" */
  title?: string;
  /** The one-sentence insight. */
  children?: React.ReactNode;
}

/** AI daily-insight card — one warm sentence about today's pace. */
export function InsightCard(props: InsightCardProps): JSX.Element;
