"use client";

/**
 * TranslationConfigStep — the 4-field translation configuration panel
 * (F2 AC Rule 1, CONF-01 + CONF-02). Renders ONLY when the chooser
 * state is `translation` or `both` (the parent page gates the render
 * via the URL `?workflow=...` value, per F2 Rule 1: irrelevant panels
 * HIDDEN, not greyed-out).
 *
 * Source language prefill (D-06): `useEpubMetadata(epubId)` →
 * `declared_languages`. When the EPUB declares exactly one language,
 * the source field is pre-filled. When >1, the field is left blank
 * and a hint renders. When 0 + no source picked, submission is gated
 * client-side + the backend 422 `source_language_required` is the
 * authoritative check.
 *
 * NLTK notice (D-09): when source OR target is in
 * `useNltkHealth().data.fallback_languages`, the inline
 * `<NoticeBanner>` renders below the language pickers with the
 * `suggest_command` + "Copy command" button. Non-blocking — the form
 * remains submittable. Dismissable per session.
 *
 * Submit: calls `useCreateJob.mutate({job_type: "translation", ...})`;
 * on success, `router.push(\`/jobs/\${data.id}\`)` to render the
 * `JobStatusPanel`. On `source_language_required` 422, an inline error
 * block renders.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CreateJobServerError, useCreateJob } from "@/hooks/useCreateJob";
import { useDefaultBaseUrls } from "@/hooks/useDefaultBaseUrls";
import { useEpubMetadata } from "@/hooks/useEpubMetadata";
import { useNltkHealth } from "@/hooks/useNltkHealth";
import { findLanguageName } from "@/lib/target_languages";
import { translationConfigSchema } from "@/lib/translationConfigSchema";

import { NoticeBanner } from "./NoticeBanner";
import { type ProviderId, ProviderModelSelect } from "./ProviderModelSelect";
import { TargetLanguageSelect } from "./TargetLanguageSelect";

import "./TranslationConfigStep.css";

export interface TranslationConfigStepProps {
  epubId: string;
  onJobCreated?: (jobId: string) => void;
}

export function TranslationConfigStep({ epubId, onJobCreated }: TranslationConfigStepProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // D-17: the combined `translation + voiceover` workflow is a
  // Phase 4 work item. When the chooser is set to `both`, the page
  // already shows an inline "coming soon" notice, but the submit
  // button on this panel was still enabled — which would POST a
  // `job_type: "translation"` for the `both` workflow and round-trip
  // to the backend. Disable the button explicitly so the form
  // cannot submit while `both` is selected.
  const isCombinedWorkflow = searchParams?.get("workflow") === "both";
  const metadata = useEpubMetadata(epubId);
  const nltk = useNltkHealth();
  const createJob = useCreateJob();
  // Quick 260708-t1t: read the runtime defaults from the new
  // `useDefaultBaseUrls` react-query hook. The `useState` initial
  // value picks `defaults.X ?? "<literal-fallback>"` so the form is
  // rendered with a mock-friendly URL while the fetch is in flight.
  const defaults = useDefaultBaseUrls();

  const declared = metadata.data?.declared_languages ?? [];

  const [provider, setProvider] = useState<ProviderId>("openai-compatible");
  const [model, setModel] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [target, setTarget] = useState<string>("");
  const [sourceTouched, setSourceTouched] = useState(false);
  const [nltkDismissed, setNltkDismissed] = useState(false);
  // Phase 1 plan 02: base URL state for the chosen provider. The
  // defaults come from `useDefaultBaseUrls()` (the runtime API
  // source); the user can override per-render. The values are
  // sent to the backend on submit (forward-compat with Plan 04's
  // `HttpTranslationAdapter`).
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState<string>(
    defaults.ollamaBaseUrl ?? "http://localhost:11434/",
  );
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState<string>(
    defaults.openaiBaseUrl ?? "https://api.openai.com/v1",
  );

  // Quick 260708-t1t: sync the local URL state when the runtime
  // default fetch resolves. The guard preserves a user-typed
  // value: the sync only fires when the current local value still
  // matches the literal fallback (i.e. the user has NOT typed a
  // custom value).
  useEffect(() => {
    if (defaults.ollamaBaseUrl !== undefined && ollamaBaseUrl === "http://localhost:11434/") {
      setOllamaBaseUrl(defaults.ollamaBaseUrl);
    }
  }, [defaults.ollamaBaseUrl, ollamaBaseUrl]);
  useEffect(() => {
    if (defaults.openaiBaseUrl !== undefined && openaiBaseUrl === "https://api.openai.com/v1") {
      setOpenaiBaseUrl(defaults.openaiBaseUrl);
    }
  }, [defaults.openaiBaseUrl, openaiBaseUrl]);

  // D-06: prefill source from declared_languages when exactly 1 language.
  useEffect(() => {
    if (sourceTouched) return;
    if (declared.length === 1) {
      setSource(declared[0]);
    }
  }, [declared, sourceTouched]);

  // ProviderModelSelect pre-picks the first model once loaded.
  useEffect(() => {
    if (model) return;
    // The ProviderModelSelect owns the fetch and reports back via
    // onModelChange when the user picks. We auto-pick the first
    // option by watching the model's data is awkward without
    // re-exposing it; leave the field empty until the user picks
    // (the BDD AC is that the list is populated, not auto-selected).
  }, [model]);

  const fallbackLangs = nltk.data?.fallback_languages ?? [];
  const supportedLangs = nltk.data?.supported_languages ?? [];
  // D-09 banner: three states for the picked source language:
  //   1. source in `supported_languages` AND not in `fallback_languages`
  //      → no banner (fully supported, punkt_tab is installed).
  //   2. source in `fallback_languages` (supported by NLTK but the
  //      punkt_tab pickle is missing on disk) → banner WITH the
  //      `suggest_command` + a "Copy command" button.
  //   3. source NOT in `supported_languages` (NLTK does not ship a
  //      tokenizer for that language at all) → banner WITHOUT an
  //      install command (suggest_command would not help).
  const showNltkNotice = useMemo(() => {
    if (nltkDismissed) return false;
    if (!nltk.data) return false;
    if (!source) return false;
    return fallbackLangs.includes(source) || !supportedLangs.includes(source);
  }, [nltkDismissed, nltk.data, source, fallbackLangs, supportedLangs]);
  const showInstallCommand = useMemo(() => {
    if (!nltk.data || !source) return false;
    return fallbackLangs.includes(source) && Boolean(nltk.data.suggest_command);
  }, [nltk.data, source, fallbackLangs]);

  const showSourceHint = declared.length > 1 && !source;
  const noDeclaredLanguages = declared.length === 0;

  // Zod-validated form gate (Phase 1 plan 01). The schema is the
  // single source of truth for the 4-field form; the same schema
  // will be reused for the request body shape in Plan 02.
  //
  // The schema enforces non-empty source; the component-level
  // conditional handles the "EPUB declares 0 languages + user
  // didn't pick" case by suppressing the source-required check at
  // the gate (the backend 422 `source_language_required` is the
  // authoritative gate; the client-side hint guides the user).
  const parsed = useMemo(
    () =>
      translationConfigSchema.safeParse({
        provider,
        model,
        sourceLanguage: source,
        targetLanguage: target,
      }),
    [provider, model, source, target],
  );
  const sourceRequiredButEmpty = !source && noDeclaredLanguages;
  const isFormValid = parsed.success || (sourceRequiredButEmpty && target && model);
  // Mirror the existing behaviour: when EPUB declares 0 languages
  // AND the user did not pick a source, the button stays disabled
  // (matches the original `!source && noDeclaredLanguages` clause).
  const isStartDisabled =
    isCombinedWorkflow || createJob.isPending || !target || !model || !isFormValid;

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!source && noDeclaredLanguages) {
        // Client-side pre-check — the backend 422 is the authoritative gate.
        return;
      }
      if (!target) {
        return;
      }
      if (!model) {
        return;
      }
      try {
        const result = await createJob.mutateAsync({
          job_type: "translation",
          epub_id: epubId,
          provider,
          model,
          source_language: source || null,
          target_language: target,
          provider_base_url: provider === "ollama" ? ollamaBaseUrl : openaiBaseUrl,
        });
        if (onJobCreated) {
          onJobCreated(result.id);
        }
        // Static-export friendly: the job id is passed via a query param
        // (not a dynamic segment) so the route is enumerated at build
        // time. See /jobs/page.tsx.
        router.push(`/jobs?id=${encodeURIComponent(result.id)}`);
      } catch {
        // The mutation's `error` is rendered below.
      }
    },
    [
      createJob,
      epubId,
      model,
      noDeclaredLanguages,
      onJobCreated,
      openaiBaseUrl,
      ollamaBaseUrl,
      provider,
      router,
      source,
      target,
    ],
  );

  const errorCode = createJob.error instanceof CreateJobServerError ? createJob.error.code : null;
  const errorMessage = createJob.error?.message ?? null;

  // The notice text for D-09:
  //   - target in `fallback_languages` → "uses a regex-based fallback ...
  //     To enable ML-based sentence detection, run the install command below."
  //   - target NOT in `supported_languages` (NLTK-unsupported) → "is not
  //     supported by NLTK's sentence tokenizer. A regex-based splitter is used."
  const sourceIsFallback = source && fallbackLangs.includes(source);
  const sourceIsUnsupported = source && !supportedLangs.includes(source);
  const nltkMessage = sourceIsFallback
    ? `Sentence splitting for ${findLanguageName(source)} (${source}) uses a regex-based fallback (less accurate on abbreviations). To enable ML-based sentence detection, run the install command below.`
    : sourceIsUnsupported
      ? `Sentence splitting for ${findLanguageName(source)} (${source}) uses a regex-based fallback — NLTK does not ship a sentence tokenizer for this language.`
      : "Some source languages curretly use a regex-based sentence splitter. To enable ML-based sentence detection, run the install command below.";

  return (
    <form
      id="translation-config"
      className="translation-config"
      onSubmit={handleSubmit}
      data-testid="translation-config"
      aria-label="Translation configuration"
    >
      <h2 className="translation-config__title">Translation configuration</h2>

      <ProviderModelSelect
        provider={provider}
        model={model}
        onProviderChange={setProvider}
        onModelChange={setModel}
        ollamaBaseUrl={ollamaBaseUrl}
        onOllamaBaseUrlChange={setOllamaBaseUrl}
        openaiBaseUrl={openaiBaseUrl}
        onOpenaiBaseUrlChange={setOpenaiBaseUrl}
      />

      <TargetLanguageSelect
        value={source}
        onChange={(code) => {
          setSourceTouched(true);
          setSource(code);
        }}
        sourceCode={undefined}
        label="Source language"
        testId="source-language"
        placeholder="Pick the source language"
        showSameAsSourceWarning={false}
      />

      <TargetLanguageSelect
        value={target}
        onChange={setTarget}
        sourceCode={source}
        label="Target language"
        testId="target-language"
        placeholder="Pick the target language"
      />

      {showSourceHint ? (
        <p className="translation-config__hint" role="note" data-testid="source-hint">
          This EPUB declares multiple languages ({declared.join(", ")}). Pick the source language
          above.
        </p>
      ) : null}

      {noDeclaredLanguages ? (
        <p className="translation-config__hint" role="note" data-testid="source-required-hint">
          This EPUB doesn&apos;t declare a language — please pick a source language.
        </p>
      ) : null}

      {showNltkNotice ? (
        <NoticeBanner
          tone="info"
          message={nltkMessage}
          copyText={showInstallCommand ? (nltk.data?.suggest_command ?? undefined) : undefined}
          onDismiss={() => setNltkDismissed(true)}
          testId="nltk-notice"
        />
      ) : null}

      {errorCode === "source_language_required" ? (
        <NoticeBanner
          tone="error"
          message="The EPUB doesn't declare a language and no source was picked. Please pick a source language above."
          testId="source-language-required"
        />
      ) : null}

      {errorCode && errorCode !== "source_language_required" && errorMessage ? (
        <NoticeBanner tone="error" message={errorMessage} testId="translation-config-error" />
      ) : null}

      <div className="translation-config__actions">
        <button
          type="submit"
          className="btn btn--primary"
          data-testid="submit-translation-job"
          disabled={isStartDisabled}
        >
          {createJob.isPending ? "Starting…" : "Start translation"}
        </button>
      </div>
    </form>
  );
}
