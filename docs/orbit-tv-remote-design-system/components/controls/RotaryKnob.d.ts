import type { ReactNode } from 'react';

export interface RotaryKnobProps {
  size?: number;
  disabled?: boolean;
  center?: ReactNode;
  onStep?: (direction: 'up' | 'down') => void;
}
