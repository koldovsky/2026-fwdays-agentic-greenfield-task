export interface BadgeProps {
  status?: 'online' | 'offline' | 'connecting';
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
