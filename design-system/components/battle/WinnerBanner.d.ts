export interface WinnerBannerProps {
  name: string;
  /** Winning side; 'draw' shows the honest tie message and mutes the color. */
  side?: 'a' | 'b' | 'draw';
}
export function WinnerBanner(props: WinnerBannerProps): JSX.Element;
