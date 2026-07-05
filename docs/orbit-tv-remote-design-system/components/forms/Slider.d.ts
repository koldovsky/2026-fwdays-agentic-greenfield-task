export interface SliderProps {
  value?: number;
  min?: number;
  max?: number;
  onChange?: (next: number) => void;
  /**
   * Fires once per interaction commit: drag end (mouse/touch release) or
   * keyboard release after an arrow-key step. Consumers use this for
   * write-only bindings (e.g. volume: fire the HTTP request only when
   * the user lets go, not per intermediate value). Value is the final
   * slider value at commit time.
   */
  onCommit?: (value: number) => void;
  disabled?: boolean;
  /** Material Symbols icon rendered to the left (e.g. volume_up). */
  icon?: string;
}
