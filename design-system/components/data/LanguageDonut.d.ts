export interface LanguageDatum { name: string; pct: number; color?: string; }
export interface LanguageDonutProps {
  languages: LanguageDatum[];
  /** Center figure; defaults to languages.length. */
  total?: number;
}
export function LanguageDonut(props: LanguageDonutProps): JSX.Element;
