export interface CardProps {
  children?: React.ReactNode;
  /** raised = extruded (default surface for lists/panels); inset = recessed (wells, tracks). */
  variant?: 'raised' | 'inset';
  padding?: string;
  radius?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}
