// Horizontal bars for reach & influence (user-stats). Each bar is scaled to the
// largest value in the set; the formatted value sits alongside. Pure CSS.
export interface ReachDatum {
  label: string;
  value: number;
  display: string;
}

export function ReachBar({ data }: { data: ReachDatum[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="font-sans">
      {data.map((d) => (
        <div key={d.label} className="mb-4 flex items-center gap-4 last:mb-0">
          <div className="w-[90px] shrink-0 text-[14px]">{d.label}</div>
          <div className="h-[22px] flex-1 overflow-hidden rounded-md bg-surface-track">
            <div
              className="h-full rounded-md bg-accent-primary"
              style={{ width: `${Math.max(2, Math.round((d.value / max) * 100))}%` }}
            />
          </div>
          <div className="w-[74px] shrink-0 text-right font-serif text-[19px]">{d.display}</div>
        </div>
      ))}
    </div>
  );
}
