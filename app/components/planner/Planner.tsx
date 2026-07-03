"use client";

import { useMemo, useState } from "react";
import { useProfile } from "@/app/hooks/useProfile";
import { DATA_AS_OF, DATA_DISCLAIMER } from "@/app/lib/programs";
import { HINT_RECOMPUTE } from "@/app/lib/copy";
import { benefitBonus } from "@/app/lib/scoring";
import {
  averageScore,
  fittingCount,
  selectPrograms,
} from "@/app/lib/recommend";
import { ProfilePanel } from "./ProfilePanel";
import { ScorePanel } from "./ScorePanel";
import { FilterPanel } from "./FilterPanel";
import { Recommendations } from "./Recommendations";
import { Comparison } from "./Comparison";
import { SavedList } from "./SavedList";
import { DetailModal } from "./DetailModal";

type View = "recs" | "compare" | "saved";

/**
 * Planner — the single interactive screen. Owns the profile (via useProfile),
 * derives the scored/filtered program list, and switches between the
 * recommendations, comparison, and saved views. All recomputation is live
 * (NFR-PERF-01); the detail modal overlays any view.
 */
export function Planner() {
  const profile = useProfile();
  const [view, setView] = useState<View>("recs");
  const [openId, setOpenId] = useState<string | null>(null);

  const scored = useMemo(
    () =>
      selectPrograms({
        scores: profile.scores,
        benefits: profile.benefits,
        elective: profile.elective,
        fields: profile.fields,
        cities: profile.cities,
      }),
    [profile.scores, profile.benefits, profile.elective, profile.fields, profile.cities],
  );

  const savedCount = Object.keys(profile.saved).length;
  const tabs: { key: View; label: string }[] = [
    { key: "recs", label: "Рекомендації" },
    { key: "compare", label: `Порівняння · ${profile.compare.length}` },
    { key: "saved", label: `Збережені · ${savedCount}` },
  ];

  return (
    <>
      <div className="pk-planner">
        <aside className="pk-planner__sidebar" aria-label="Твій профіль і фільтри">
          <ProfilePanel
            averageScore={averageScore(profile.scores)}
            matchCount={fittingCount(scored)}
            bonus={benefitBonus(profile.benefits)}
          />
          <ScorePanel profile={profile} />
          <FilterPanel profile={profile} />
          <p className="pk-planner__hint">{HINT_RECOMPUTE}</p>
          <p className="pk-planner__hint">
            {DATA_AS_OF}. {DATA_DISCLAIMER}
          </p>
        </aside>

        <div className="pk-planner__main">
          <div className="pk-planner__toolbar">
            <div className="pk-segment" role="tablist" aria-label="Розділи">
              {tabs.map((tab) => {
                const active = view === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`pk-segment__item${active ? " pk-segment__item--active" : ""}`}
                    onClick={() => setView(tab.key)}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {view === "recs" && (
            <Recommendations scored={scored} profile={profile} onOpen={setOpenId} />
          )}
          {view === "compare" && <Comparison profile={profile} />}
          {view === "saved" && <SavedList profile={profile} onOpen={setOpenId} />}
        </div>
      </div>

      {openId && (
        <DetailModal programId={openId} profile={profile} onClose={() => setOpenId(null)} />
      )}
    </>
  );
}
