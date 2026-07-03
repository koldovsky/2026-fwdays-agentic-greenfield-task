export interface AppShortcutProps {
  /** Material Symbols icon name — generic stand-in since no brand app icons were supplied. */
  icon: string;
  label: string;
  onClick?: () => void;
  color?: string;
}
