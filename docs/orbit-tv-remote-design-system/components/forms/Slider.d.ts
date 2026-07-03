export interface SliderProps {
  value?: number;
  min?: number;
  max?: number;
  onChange?: (next: number) => void;
  /** Material Symbols icon rendered to the left (e.g. volume_up). */
  icon?: string;
}
