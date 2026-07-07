"use client";

// tailor-workspace view — owns the resume-tailoring WIZARD state machine
// (add-resume-wizard task 1.7, FR-WIZARD-01/05): analyze → confirm → clarify →
// generate → export, plus a terminal failed state. The confirm step is a
// client-only transition (no server call) — the user sees the match score +
// checklist and explicitly chooses to proceed before any bullet is generated
// (FR-WIZARD-01). The paused state (analysis result + confirmed answers) is
// held here in React state between the two HTTP calls (/api/tailor/analyze then
// /api/tailor/generate).
//
// Honesty + export invariants are unchanged from the one-shot flow: the loop
// applies applyExportDefaults server-side (BC-HONESTY-02 — grounded in,
// overclaim-risk out), so this view seeds local toggle state from
// result.bullets rather than re-deriving it. Widget composition (checklist-panel
// + bullet-list into result-view's slots) stays at the view layer; no widget
// imports another widget.
//
// Paywall (FR-PAYWALL-01) is opened at two points, exactly as before: the
// export CTA when the server-resolved entitlement is not paid, and a
// `rate_limited` GENERATION run (the NFR-COST-02 budget gate lives server-side;
// the analyze step's separate anti-abuse cap is surfaced inline by AnalyzeForm,
// never here). No limit or entitlement logic is duplicated in this view.
import { useMemo, useState } from "react";

import type { Bullet } from "@/entities/bullet";
import { parseCvDocument } from "@/entities/cv-profile";
import { ClarifyingQuestions } from "@/features/clarify-tailoring";
import {
  AnalyzeForm,
  streamGenerate,
  type AnalysisResult,
  type TailoringRunResult,
} from "@/features/run-tailoring";
import { UploadCvDropzone } from "@/features/upload-cv";
import type { ConfirmedAnswerEvidence, DocumentAttachment } from "@/shared/lib/llm";
import { t, type Locale } from "@/shared/lib/i18n";
import { Button } from "@/shared/ui";
import { BulletList } from "@/widgets/bullet-list";
import { ChecklistPanel, type ChecklistPanelRow } from "@/widgets/checklist-panel";
import { ExportStepper } from "@/widgets/export-stepper";
import { Paywall, type PaywallReason } from "@/widgets/paywall";
import { ResultView } from "@/widgets/result-view";
import { toConfirmedAnswers } from "../lib/confirmed-answers";
import { WizardSteps, type WizardStep } from "./WizardSteps";

type WizardPhase = WizardStep | "failed";

export interface TailorWorkspaceProps {
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
  /**
   * Server-resolved paid entitlement (FR-PAYWALL-01): true unlocks export.
   * Resolved by the route from the subscription state — never client-derived.
   */
  readonly paid?: boolean;
}

export function TailorWorkspace({ locale = "ua", paid = false }: TailorWorkspaceProps) {
  const copy = t(locale);
  const [phase, setPhase] = useState<WizardPhase>("analyze");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [jdText, setJdText] = useState("");
  const [cvText, setCvText] = useState("");
  const [result, setResult] = useState<TailoringRunResult | null>(null);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  // Confirmed wizard answers retained past generation so the export step can
  // forward them as a second evidence lane to the grounded cover letter (T5
  // §3.1, BC-HONESTY-03). Never merged with the CV sentences.
  const [confirmedAnswers, setConfirmedAnswers] = useState<readonly ConfirmedAnswerEvidence[]>([]);
  const [paywall, setPaywall] = useState<PaywallReason | null>(null);
  // Original CV PDF for the paid multimodal generation pass (T5). Captured at
  // the upload step; the server re-checks entitlement before honoring it.
  const [attachment, setAttachment] = useState<DocumentAttachment | null>(null);

  const checklistRows: ChecklistPanelRow[] = useMemo(
    () =>
      analysis === null
        ? []
        : analysis.checklist.map((row) => ({
            requirement: row.requirement,
            status: row.item.status,
            rationale: row.item.rationale,
          })),
    [analysis],
  );

  // Sectioned CV parse for the structured résumé export (T5 §4). Pure + local
  // (entities/cv-profile). SECURITY: this contains contact PII and is passed
  // ONLY to ExportStepper's export builder — never to any analyze/generate/
  // cover-letter request (NFR-SEC-01/02). Kept distinct from letterEvidence.
  const cvDocument = useMemo(
    () => (cvText.trim().length > 0 ? parseCvDocument(cvText) : undefined),
    [cvText],
  );

  const handleAnalysis = (next: AnalysisResult, jd: string) => {
    setAnalysis(next);
    setJdText(jd);
    setPaywall(null);
    setPhase("confirm");
  };

  const handleConfirm = () => {
    if (analysis === null) return;
    // Client-only transition (FR-WIZARD-01): branch to clarify only if there are
    // questions; otherwise go straight to generation with no confirmed answers.
    if (analysis.clarifyingQuestions.length > 0) {
      setPhase("clarify");
    } else {
      void startGenerate([]);
    }
  };

  async function startGenerate(confirmedAnswers: readonly ConfirmedAnswerEvidence[]) {
    if (analysis === null) return;
    // Retain for the export-time grounded letter (T5 §3.1) — same lane the
    // generation pass already treats as confirmed evidence (BC-HONESTY-03).
    setConfirmedAnswers(confirmedAnswers);
    setPhase("generate");
    // A healthy run ends in a terminal `result` or `error`; a stream that closes
    // without one surfaces a calm failure rather than hanging (NFR-OBS-01).
    let sawTerminal = false;
    const input = {
      cvProfile: analysis.cvProfile,
      requirements: analysis.requirements,
      jobDescription: jdText,
      confirmedAnswers,
      checklist: analysis.checklist,
      matchScore: analysis.matchScore,
      // Echo the inferred stage from the analyze phase so the wizard flow also
      // gets tone calibration (§3.5) — without this the seniority call runs in
      // analysis and its result is silently dropped at the client boundary.
      ...(analysis.careerStage !== undefined ? { careerStage: analysis.careerStage } : {}),
    };
    // Pass the paid original-PDF only when present, so the text-only path keeps
    // the single-arg call. The server re-checks paid access before honoring it,
    // so a non-paid client passing it changes nothing (NFR-SEC-04).
    const stream =
      attachment !== null ? streamGenerate(input, attachment) : streamGenerate(input);
    try {
      for await (const event of stream) {
        if (event.type === "error") {
          sawTerminal = true;
          if (event.code === "rate_limited") {
            // The NFR-COST-02 budget gate — return to confirm and open the
            // paywall above it (FR-PAYWALL-01); nothing was generated.
            setPaywall("tailoring-limit");
            setPhase("confirm");
          } else {
            setPhase("failed");
          }
          continue;
        }
        if (event.type === "result") {
          sawTerminal = true;
          setResult(event.result);
          // result.bullets already carries export defaults (BC-HONESTY-02) —
          // copy, don't re-derive, into local toggle state.
          setBullets([...event.result.bullets]);
          setPaywall(null);
          setPhase("export");
        }
      }
      if (!sawTerminal) setPhase("failed");
    } catch {
      setPhase("failed");
    }
  }

  const handleClarifySubmit = (answers: Parameters<typeof toConfirmedAnswers>[1]) => {
    if (analysis === null) return;
    void startGenerate(toConfirmedAnswers(analysis.clarifyingQuestions, answers));
  };

  const handleToggleInclude = (id: string) => {
    setBullets((prev) =>
      prev.map((bullet) =>
        bullet.id === id ? { ...bullet, includedInExport: !bullet.includedInExport } : bullet,
      ),
    );
  };

  const startOver = () => {
    setAnalysis(null);
    setResult(null);
    setBullets([]);
    setConfirmedAnswers([]);
    setJdText("");
    setPaywall(null);
    setAttachment(null);
    setPhase("analyze");
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <p className="font-body text-base text-ink-soft leading-normal mb-8 max-w-2xl">
        {copy.workspace.lead}
      </p>

      {phase !== "failed" && (
        <WizardSteps
          current={phase}
          // Before analysis, clarify is still part of the planned sequence;
          // after it, drop the step when there are no questions to ask.
          includeClarify={analysis === null || analysis.clarifyingQuestions.length > 0}
          locale={locale}
        />
      )}

      {phase === "analyze" && (
        <>
          <div className="mb-6">
            <UploadCvDropzone
              locale={locale}
              onExtracted={setCvText}
              paid={paid}
              onAttachmentChange={setAttachment}
              onUpgrade={() => setPaywall("attach")}
            />
          </div>
          <AnalyzeForm
            locale={locale}
            onAnalysis={handleAnalysis}
            cvText={cvText}
            onCvTextChange={setCvText}
          />
          <p className="font-body text-base text-ink-soft leading-normal mt-8 max-w-2xl">
            {copy.workspace.emptyState}
          </p>
        </>
      )}

      {phase === "confirm" && analysis !== null && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="font-display text-2xl tracking-tight text-ink">
              {copy.wizard.confirmHeading}
            </h2>
            <p className="mt-2 max-w-2xl font-body text-base text-ink-soft">
              {copy.wizard.confirmLead}
            </p>
          </div>
          <ChecklistPanel score={analysis.matchScore} rows={checklistRows} locale={locale} />
          <div className="flex items-center gap-3">
            <Button size="md" onClick={handleConfirm}>
              {copy.wizard.confirmAction}
            </Button>
            <Button variant="ghost" size="md" onClick={startOver}>
              {copy.wizard.startOverAction}
            </Button>
          </div>
        </div>
      )}

      {phase === "clarify" && analysis !== null && (
        <ClarifyingQuestions
          questions={analysis.clarifyingQuestions}
          onSubmit={handleClarifySubmit}
          locale={locale}
        />
      )}

      {phase === "generate" && (
        <p role="status" className="font-body text-base text-ink-soft">
          {copy.wizard.generating}
        </p>
      )}

      {phase === "export" && result !== null && (
        <div className="flex flex-col gap-6">
          <ResultView
            locale={locale}
            left={<ChecklistPanel score={result.matchScore} rows={checklistRows} locale={locale} />}
            right={
              <BulletList bullets={bullets} onToggleInclude={handleToggleInclude} locale={locale} />
            }
          />
          <ExportStepper
            bullets={bullets}
            paid={paid}
            locale={locale}
            // Structured export sections (T5 §4). Contact PII lives here and on
            // the export path only; it is NOT part of letterEvidence and never
            // reaches an LLM request (NFR-SEC-01/02).
            {...(cvDocument ? { cvDocument } : {})}
            // Grounded-letter evidence (T5 §3.1): the candidate's own CV
            // sentences + confirmed answers, plus requirements (emphasis) and
            // careerStage (tone). The server verifies before it ships; on any
            // failure it falls back to the deterministic reflow. Never the JD.
            letterEvidence={{
              cvSentences: analysis?.cvProfile.sentences ?? [],
              requirements: analysis?.requirements ?? [],
              ...(confirmedAnswers.length > 0 ? { confirmedAnswers } : {}),
              ...(result.careerStage !== undefined ? { careerStage: result.careerStage } : {}),
            }}
            onPaywall={() => setPaywall("export")}
            onStartOver={startOver}
          />
        </div>
      )}

      {phase === "failed" && (
        <div className="flex flex-col gap-4">
          <p role="alert" className="font-body text-base text-gap-text">
            {copy.tailorRun.failed}
          </p>
          <div>
            <Button size="md" onClick={startOver}>
              {copy.wizard.startOverAction}
            </Button>
          </div>
        </div>
      )}

      {paywall !== null && (
        <div className="mt-8">
          <Paywall reason={paywall} locale={locale} onDismiss={() => setPaywall(null)} />
        </div>
      )}
    </main>
  );
}
