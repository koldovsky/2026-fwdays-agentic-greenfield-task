// Vertical bar chart of the four 90-day activity metrics (user-stats: recent
// activity). Pure CSS per TC-STACK-05: flex columns with height scaled to the
// largest value; bars use the DS accent on the track token.
export interface ActivityDatum {
  label: string;
  value: number;
}

export function ActivityChart({ data, height = 150 }: { data: ActivityDatum[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div
      className="flex items-end gap-3.5 font-sans"
      style={{ height }}
      role="img"
      aria-label={`Activity: ${data.map((d) => `${d.label} ${d.value}`).join(", ")}`}
    >
      {data.map((d) => (
        <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <div className="font-serif text-[18px]">{d.value}</div>
          <div className="flex w-full flex-1 items-end overflow-hidden rounded-t-[7px] bg-surface-track">
            <div
              className="w-full rounded-t-[7px] bg-accent-primary"
              style={{ height: `${Math.max(2, Math.round((d.value / max) * 100))}%` }}
            />
          </div>
          <div className="text-center text-[11.5px] text-text-muted">{d.label}</div>
        </div>
      ))}
    </div>
  );
}
