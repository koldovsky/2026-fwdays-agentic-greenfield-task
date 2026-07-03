export interface DeviceCardProps {
  name: string;
  model?: string;
  ip: string;
  status?: 'online' | 'offline' | 'connecting';
  onClick?: () => void;
}
