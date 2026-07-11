"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { ChooserStep, type Workflow, readWorkflowFromSearchParams } from "@/components/ChooserStep";
import { ErrorBlock } from "@/components/ErrorBlock";
import { TranslationConfigStep } from "@/components/TranslationConfigStep";
import { UploadCard } from "@/components/UploadCard";
import { VoiceoverConfigStep } from "@/components/VoiceoverConfigStep";
import { type UploadEpubVariables, useUploadEpub } from "@/hooks/useUploadEpub";
import type { EpubUploadResponse } from "@/lib/api-contract";

/**
 * Top-level page — composes the upload card + chooser + config panels.
 * The card is presentational; this page owns the `metadata` + `error`
 * state. The chooser state is in the URL `?workflow=...`; each config
 * panel renders only when the chooser matches (CONF-01 + F2 Rule 1:
 * irrelevant panels HIDDEN, not greyed-out).
 *
 * Phase 3 (D-16): the `voiceover` chooser now renders the real
 * `<VoiceoverConfigStep>` (no "Coming soon" badge on the card). The
 * `both` (translation+voiceover) chooser is a Phase 4 work item
 * (D-17) and shows a friendly inline notice.
 *
 * `useSearchParams` triggers the CSR-bailout in static export; we wrap
 * the inner content in a `<Suspense>` boundary (Next.js 16 requirement).
 */
function HomeInner() {
  const searchParams = useSearchParams();
  const [metadata, setMetadata] = useState<EpubUploadResponse | null>(null);
  const [workflow, setWorkflow] = useState<Workflow>(() =>
    readWorkflowFromSearchParams(searchParams?.get("workflow") ?? null),
  );
  const [errorState, setErrorState] = useState<{ code: string; message: string } | null>(null);

  const handleError = useCallback((err: Error) => {
    setMetadata(null);
    if ("code" in err && typeof (err as { code?: unknown }).code === "string") {
      const code = (err as { code: string }).code;
      setErrorState({ code, message: err.message });
    } else {
      setErrorState({ code: "unknown", message: err.message });
    }
  }, []);

  const mutation = useUploadEpub({
    onSuccess: (data) => {
      setErrorState(null);
      setMetadata(data);
    },
    onError: handleError,
  });

  const handleUpload = useCallback(
    async (file: File): Promise<EpubUploadResponse> => {
      setErrorState(null);
      const variables: UploadEpubVariables = { file };
      return mutation.mutateAsync(variables);
    },
    [mutation],
  );

  const handleDismissError = useCallback(() => {
    setErrorState(null);
  }, []);

  const handleRetry = useCallback(() => {
    // No-op — the upload card's reset path re-opens the file picker.
  }, []);

  // Phase 1 plan 01: "Upload another" must clear the parent's
  // metadata + error state so the card flips back to the dropzone
  // (instead of re-rendering the previous metadata preview). The
  // card chains `onReset()` + `inputRef.current?.click()` so the
  // picker re-opens in the same gesture.
  const handleReset = useCallback(() => {
    setMetadata(null);
    setErrorState(null);
  }, []);

  const handleWorkflowChange = useCallback((next: Workflow) => {
    setWorkflow(next);
  }, []);

  // Quick 260710-oih: smooth-scroll to the matching config panel
  // when the user picks a workflow. The effect fires AFTER the
  // panel has rendered (the panel renders inside the `metadata ?`
  // branch; the effect runs once the render commits + the rAF
  // fires). The cleanup function cancels a pending rAF so a fast
  // workflow-switch does not race the previous scroll. The
  // `both` target is `#chooser-step` (the page's existing notice
  // for the "Combined Translation + Voice-Over is coming soon"
  // inline message — the chooser itself is the natural target).
  useEffect(() => {
    if (!metadata) {
      return;
    }
    const raf = requestAnimationFrame(() => {
      const targetId =
        workflow === "voiceover"
          ? "voiceover-config"
          : workflow === "both"
            ? "chooser-step"
            : "translation-config";
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [workflow, metadata]);

  const isLoading = mutation.isPending;
  const showTranslationConfig =
    metadata != null && (workflow === "translation" || workflow === "both");
  const showVoiceoverConfig = metadata != null && workflow === "voiceover";
  const showBothNotice = metadata != null && workflow === "both";

  return (
    <main className="page">
      <h1 className="page__title">epubtv</h1>
      {isLoading ? (
        <div
          className="page__loading"
          // biome-ignore lint/a11y/useSemanticElements: <output> cannot nest the .spinner span visually
          role="status"
          aria-live="polite"
          aria-label="Validating uploaded EPUB"
          data-testid="page-loading"
        >
          <span className="spinner" data-testid="uploading-spinner" />
          <span className="page__hint">Validating…</span>
        </div>
      ) : null}
      <UploadCard
        onUpload={handleUpload}
        metadata={metadata}
        error={errorState}
        onDismissError={handleDismissError}
        onRetry={handleRetry}
        onReset={handleReset}
      />
      {isLoading && errorState ? (
        <ErrorBlock
          code={errorState.code}
          message={errorState.message}
          onDismiss={handleDismissError}
          onRetry={handleRetry}
        />
      ) : null}
      {metadata ? (
        <>
          <ChooserStep value={workflow} onChange={handleWorkflowChange} />
          {showBothNotice ? (
            <p
              className="page__hint"
              // biome-ignore lint/a11y/useSemanticElements: <output> is phrasing content; <p> matches the layout
              role="status"
              data-testid="voiceover-coming-soon"
              style={{ maxWidth: 560, width: "100%", textAlign: "left" }}
            >
              Combined Translation + Voice-Over is coming soon. Choose Translation or Voice-Over to
              continue.
            </p>
          ) : null}
          {showTranslationConfig ? <TranslationConfigStep epubId={metadata.epub_id} /> : null}
          {showVoiceoverConfig ? <VoiceoverConfigStep epubId={metadata.epub_id} /> : null}
        </>
      ) : null}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="page">
          <h1 className="page__title">epubtv</h1>
          <p className="page__hint">Loading…</p>
        </main>
      }
    >
      <HomeInner />
    </Suspense>
  );
}
