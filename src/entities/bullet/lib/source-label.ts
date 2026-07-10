// Pure evidence-pool label for a bullet's source (BC-HONESTY-03, TC-PURE-01):
// no IO, no DOM. Centralizes "which pool" wording in one place so widgets
// stay presentational instead of hardcoding the CV vs user-confirmed copy.

import { t } from "@/shared/lib/i18n";
import type { Locale } from "@/shared/lib/i18n";

import type { EvidenceSource } from "../model/types";

/**
 * Human label for a bullet's evidence source, distinguishing CV-sourced
 * evidence from a user-confirmed wizard answer (BC-HONESTY-03). Returns
 * `undefined` when there is no source — overclaim-risk bullets have none.
 */
export function sourceLabel(source: EvidenceSource | undefined, locale: Locale): string | undefined {
  if (source === undefined) {
    return undefined;
  }

  const copy = t(locale).bullets;

  switch (source.kind) {
    case "cv":
      return copy.sourceCv;
    case "user-confirmed":
      return copy.sourceUserConfirmed;
  }
}
