import type { LanguageSlice } from "@/lib/types";
import { strings } from "@/lib/strings";

// CSS conic-gradient donut + legend (TC-STACK-05, FR-LANG-01/02/03). Segments use
// GitHub's per-language colors; unknown languages fall back to a DS track tone.
// Each legend row carries a count/share tooltip and an accessible label.
const FALLBACK = "var(--text-muted)";

export function LanguageDonut({ languages }: { languages: LanguageSlice[] }) {
  if (languages.length === 0) {
    return (
      <p className="font-sans text-small text-text-muted">
        {strings.stats.noLanguages}
      </p>
    );
  }

  // Build the conic-gradient stops by accumulating each slice's share.
  let acc = 0;
  const stops: string[] = [];
  for (const lang of languages) {
    const color = lang.color ?? FALLBACK;
    const from = acc * 360;
    acc += lang.pct;
    stops.push(`${color} ${from}deg ${acc * 360}deg`);
  }
  if (acc < 0.999) stops.push(`var(--surface-track) ${acc * 360}deg 360deg`);

  return (
    <div className="flex flex-wrap items-center gap-x-[26px] gap-y-6 font-sans">
      <div className="relative size-[148px] shrink-0" role="img" aria-label={strings.stats.languagesTitle}>
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: `conic-gradient(${stops.join(",")})` }}
        />
        <div className="absolute inset-[27px] flex flex-col items-center justify-center rounded-full bg-surface">
          <div className="font-serif text-[30px] leading-none">{languages.length}</div>
          <div className="mt-0.5 text-[10.5px] uppercase tracking-[0.06em] text-text-muted">
            {strings.stats.languagesUnit}
          </div>
        </div>
      </div>

      <ul className="min-w-[150px] flex-1 space-y-2.5">
        {languages.map((lang) => (
          <li
            key={lang.name}
            className="flex items-center gap-2.5 text-[14px]"
            title={strings.a11y.languageSegment(lang.name, lang.count, lang.pct)}
          >
            <span
              className="size-[11px] shrink-0 rounded-[3px]"
              style={{ background: lang.color ?? FALLBACK }}
              aria-hidden
            />
            <span className="flex-1">{lang.name}</span>
            <span className="text-text-muted">{Math.round(lang.pct * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
