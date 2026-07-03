import React from "react";

export interface StreakHiveProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of filled (completed) cells. @default 0 */
  filled?: number;
  /** Total cells shown. @default 7 */
  total?: number;
  /** Show a bee on the most recent filled cell. */
  current?: boolean;
  /** Caption under the hive. */
  label?: string;
}

/** Streak as a row of honeycomb cells; a bee marks the newest day. */
export function StreakHive(props: StreakHiveProps): JSX.Element;
