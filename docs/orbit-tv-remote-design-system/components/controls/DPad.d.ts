export interface DPadProps {
  onDirection?: (dir: 'up' | 'down' | 'left' | 'right') => void;
  onSelect?: () => void;
  size?: number;
  disabled?: boolean;
}
