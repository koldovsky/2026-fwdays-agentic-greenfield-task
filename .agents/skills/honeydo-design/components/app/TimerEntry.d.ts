import React from "react";

export interface TimerEntryProps extends React.HTMLAttributes<HTMLDivElement> {
  description: string;
  tag?: string;
  /** CSS color for the tag dot. @default "amber" */
  tagColor?: string;
  /** Formatted elapsed time, e.g. "1:24:08" or "45m". */
  duration: string;
  /** Live/running state — glows amber, shows a Stop square. @default false */
  running?: boolean;
  /** Play (continue) or Stop tap handler. */
  onContinue?: () => void;
}

/**
 * One time-entry row with quick continue/stop.
 * @startingPoint section="App" subtitle="Time-entry row with running glow" viewport="700x120"
 */
export function TimerEntry(props: TimerEntryProps): JSX.Element;
