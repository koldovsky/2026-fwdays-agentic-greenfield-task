import React from "react";

/** Small outlined chip for metadata (methodology, channel, audience). */
export interface ChipProps {
  children: React.ReactNode;
  /** Use JetBrains Mono — for channel codes like `web` / `telegram`. */
  mono?: boolean;
  style?: React.CSSProperties;
}

export function Chip(props: ChipProps): JSX.Element;
