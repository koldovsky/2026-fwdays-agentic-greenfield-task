// bullet-list widget — presentational list of tailored résumé bullets.
// Each row shows the bullet text, a grounding badge (grounded vs overclaim-risk,
// FR-BULLETS-01) and an include-in-export toggle (FR-BULLETS-02). Overclaim-risk
// bullets are visibly flagged and reflected as excluded from export by default
// (BC-HONESTY-02). Purely presentational: no state, no data fetching — the parent
// view owns state and passes `bullets` + `onToggleInclude`.

import type { Bullet } from "@/entities/bullet";
import { GroundingBadge } from "@/shared/ui";
import { t } from "@/shared/lib/i18n";
import type { Locale } from "@/shared/lib/i18n";

export interface BulletListProps {
  /** Tailored bullets to render, in display order. */
  readonly bullets: readonly Bullet[];
  /** Emitted when a bullet's include-in-export toggle is flipped. */
  readonly onToggleInclude: (id: string) => void;
  /** UI locale — Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
}

export function BulletList({ bullets, onToggleInclude, locale = "uk" }: BulletListProps) {
  const copy = t(locale).bullets;

  return (
    <ul aria-label={copy.listLabel} className="flex flex-col gap-3 list-none p-0 m-0">
      {bullets.map((bullet) => {
        const isOverclaim = bullet.grounding === "overclaim-risk";
        const toggleId = `bullet-include-${bullet.id}`;

        return (
          <li
            key={bullet.id}
            className="flex flex-col gap-2 bg-surface-card border border-hairline rounded-xl shadow-card p-4"
          >
            <p className="font-body text-base text-ink leading-normal m-0">{bullet.text}</p>

            {bullet.sourceSentence !== undefined ? (
              <p className="font-body text-sm text-ink-soft leading-snug m-0">
                <span className="font-mono text-xs uppercase tracking-eyebrow text-ink-muted">
                  {copy.source}
                </span>{" "}
                {bullet.sourceSentence}
              </p>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <GroundingBadge status={isOverclaim ? "overclaim" : "met"} />

              <label htmlFor={toggleId} className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  id={toggleId}
                  type="checkbox"
                  className="accent-brand"
                  checked={bullet.includedInExport}
                  onChange={() => onToggleInclude(bullet.id)}
                />
                <span className="font-body text-sm text-ink-soft select-none">
                  {isOverclaim && !bullet.includedInExport
                    ? copy.excludedFromExport
                    : copy.includeInExport}
                </span>
              </label>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
