"use client";

/**
 * ChooserStep — first-class three-peer workflow chooser (Translation /
 * Voice-Over / both). Per CONTEXT.md agent-discretion: "a plain
 * <fieldset> with <input type='radio'> (no library) — accessible by
 * default, no extra dep, matches D-02's 'single card' simplicity."
 *
 * Conf-01 (irrelevant panels HIDDEN, not greyed-out): the chooser state
 * lives in the URL query param `?workflow=translation|voiceover|both`;
 * the parent (page) reads it and renders only the relevant
 * configuration panel. The `both` (translation+voiceover) card keeps
 * its "Coming soon" badge — combined-workflow is Phase 4 (D-17).
 *
 * D-16 UX detail: the `voiceover` card NO LONGER carries the
 * "Coming soon" badge (Phase 3 ships the voiceover pipeline +
 * `<VoiceoverConfigStep>`); the `both` card KEEPS the badge because
 * the combined-workflow is a Phase 4 work item.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import "./ChooserStep.css";

export type Workflow = "translation" | "voiceover" | "both";

export interface ChooserStepProps {
  /** Current workflow — defaults to the URL `?workflow=...` value. */
  value: Workflow;
  /** Called when the user picks a different workflow. */
  onChange: (workflow: Workflow) => void;
}

const WORKFLOW_LABELS: Record<Workflow, string> = {
  translation: "Translation",
  voiceover: "Voice-Over",
  both: "Translation + Voice-Over",
};

const WORKFLOW_DESCRIPTIONS: Record<Workflow, string> = {
  translation: "Translate the EPUB into a target language.",
  voiceover: "Produce an audiobook of the EPUB in its existing language.",
  both: "Translate the EPUB, then produce an audiobook of the translation.",
};

// D-16: voiceover NO LONGER in the "Coming soon" list (Phase 3 ships
// the voiceover pipeline + `<VoiceoverConfigStep>`). D-17: the `both`
// (translation+voiceover) workflow stays in the list — combined
// workflow is a Phase 4 work item.
const COMING_SOON: ReadonlyArray<Workflow> = ["both"];

function isWorkflow(value: string | null): value is Workflow {
  return value === "translation" || value === "voiceover" || value === "both";
}

export function ChooserStep({ value, onChange }: ChooserStepProps) {
  const router = useRouter();
  const params = useSearchParams();

  const select = useCallback(
    (next: Workflow) => {
      onChange(next);
      const search = new URLSearchParams(params?.toString() ?? "");
      search.set("workflow", next);
      // Preserve other params (e.g. `epub_id`); the static export only
      // requires the URL change, no server round-trip.
      router.replace(`/?${search.toString()}`);
    },
    [onChange, params, router],
  );

  return (
    <fieldset
      className="chooser"
      data-testid="chooser-step"
      data-workflow={value}
      id="chooser-step"
    >
      <legend className="chooser__legend">What do you want to do with this EPUB?</legend>
      <div className="chooser__cards">
        {(Object.keys(WORKFLOW_LABELS) as Workflow[]).map((workflow) => {
          const isSelected = value === workflow;
          const isComingSoon = COMING_SOON.includes(workflow);
          return (
            <label
              key={workflow}
              className={`chooser__card${isSelected ? " chooser__card--selected" : ""}`}
              data-testid={`chooser-${workflow}`}
              data-selected={isSelected ? "true" : "false"}
            >
              <input
                type="radio"
                name="workflow"
                value={workflow}
                className="chooser__radio sr-only"
                checked={isSelected}
                onChange={() => select(workflow)}
                data-testid={`chooser-${workflow}-input`}
              />
              <span className="chooser__card-title">
                {WORKFLOW_LABELS[workflow]}
                {isComingSoon ? (
                  <span className="chooser__badge" data-testid={`chooser-${workflow}-badge`}>
                    Coming soon
                  </span>
                ) : null}
              </span>
              <span className="chooser__card-desc">{WORKFLOW_DESCRIPTIONS[workflow]}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Read the `?workflow=...` query param with a default of `translation`. */
export function readWorkflowFromSearchParams(value: string | null): Workflow {
  return isWorkflow(value) ? value : "translation";
}
