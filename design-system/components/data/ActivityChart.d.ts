export interface ActivityDatum { label: string; value: number; }
export interface ActivityChartProps {
  data: ActivityDatum[];
  height?: number;
}
export function ActivityChart(props: ActivityChartProps): JSX.Element;
