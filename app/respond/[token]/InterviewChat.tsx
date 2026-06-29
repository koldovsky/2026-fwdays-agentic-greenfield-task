"use client";
// @trace FR-AI-01 FR-AI-06 FR-AI-07 TC-AI-04 NFR-A11Y-02 NFR-I18N-01

import { useEffect, useRef, useState, useTransition } from "react";
import { z } from "zod";
import { uk } from "@/lib/i18n/uk";
import { formatDaysRemaining } from "@/lib/i18n/format";
import { fallbackToForm } from "./actions";

const t = uk.respondent;

const errorBodySchema = z.object({ error: z.string() });

type ChatMessage = { role: "assistant" | "user"; content: string };

type Props = {
  token: string;
  initialMessages: ChatMessage[];
  subjectFirstName: string;
  methodology: string;
  deadline: Date;
  daysRemaining: number;
};

/**
 * The AI interview chat (FR-AI-01, FR-AI-06, FR-AI-07). Replaces ModeStub for
 * `cycle.mode === "interview"`. Streams each agent turn token by token over
 * server-side HTTP from the Route Handler (TC-AI-04 — no WebSocket). On an
 * empty history it asks the agent to greet; on resume it renders the saved
 * transcript and waits for input. On an API outage it shows a calm retry state
 * and offers the web form as a fallback (recorded answers are preserved
 * server-side).
 */
export function InterviewChat({
  token,
  initialMessages,
  subjectFirstName,
  methodology,
  deadline,
  daysRemaining,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [switching, startSwitching] = useTransition();
  const lastMessageRef = useRef<string | undefined>(undefined);
  const startedRef = useRef(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Append streamed text to the last (assistant placeholder) message.
  function appendToLastAssistant(delta: string) {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last !== undefined && last.role === "assistant") {
        next[next.length - 1] = { role: "assistant", content: last.content + delta };
      }
      return next;
    });
  }

  async function runTurn(message: string | undefined, userAlreadyShown: boolean) {
    lastMessageRef.current = message;
    setError(null);
    setStreaming(true);
    setThinking(true);

    setMessages((prev) => {
      const next = [...prev];
      if (message !== undefined && !userAlreadyShown) {
        next.push({ role: "user", content: message });
      }
      next.push({ role: "assistant", content: "" });
      return next;
    });

    try {
      const response = await fetch(`/respond/${token}/interview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(message !== undefined ? { message } : {}),
      });

      if (!response.ok) {
        const data: unknown = await response.json().catch(() => null);
        const parsed = errorBodySchema.safeParse(data);
        removePlaceholder();
        setError(parsed.success ? parsed.data.error : t.interviewUnavailable);
        return;
      }

      const reader = response.body?.getReader();
      if (reader === undefined) {
        removePlaceholder();
        setError(t.interviewConnectionLost);
        return;
      }

      const decoder = new TextDecoder();
      let receivedAny = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!receivedAny) {
          receivedAny = true;
          setThinking(false);
        }
        appendToLastAssistant(decoder.decode(value, { stream: true }));
      }

      if (response.headers.get("x-interview-complete") === "true") {
        setComplete(true);
      }
    } catch {
      // Network or mid-stream failure — answers recorded server-side survive.
      removePlaceholder();
      setError(t.interviewConnectionLost);
    } finally {
      setStreaming(false);
      setThinking(false);
    }
  }

  function removePlaceholder() {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last !== undefined && last.role === "assistant" && last.content.length === 0) {
        return prev.slice(0, -1);
      }
      return prev;
    });
  }

  // Greet on an empty history, exactly once. Deferred to a macrotask so the
  // turn's setState calls do not run synchronously inside the effect.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (initialMessages.length > 0) return;
    const id = setTimeout(() => void runTurn(undefined, false), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  function handleSend() {
    const trimmed = input.trim();
    if (trimmed.length === 0 || streaming) return;
    setInput("");
    void runTurn(trimmed, false);
  }

  function handleRetry() {
    if (streaming) return;
    void runTurn(lastMessageRef.current, true);
  }

  function handleSwitchToForm() {
    startSwitching(async () => {
      const result = await fallbackToForm({ token });
      if (result.ok) window.location.reload();
      else setError(result.error);
    });
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col px-[var(--space-9)] py-[var(--space-10)]">
      <h1 className="text-[var(--text-xl)] font-[var(--weight-semibold)] text-ink">
        {t.greeting.replace("{name}", subjectFirstName)}
      </h1>
      <p className="mt-[var(--space-3)] text-[var(--text-sm)] text-ink-muted">
        {t.confidentiality}
      </p>

      <dl className="mt-[var(--space-6)] grid grid-cols-2 gap-x-[var(--space-9)] gap-y-[var(--space-4)] text-[var(--text-sm)]">
        <div>
          <dt className="text-ink-muted">{t.methodology}</dt>
          <dd className="mt-[var(--space-1)] text-ink">{methodology}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">{t.deadline}</dt>
          <dd className="mt-[var(--space-1)] text-ink">
            {deadline.toISOString().slice(0, 10)} —{" "}
            {formatDaysRemaining(daysRemaining, uk.cycles.overdue)}
          </dd>
        </div>
      </dl>

      <div
        role="log"
        aria-live="polite"
        className="mt-[var(--space-8)] flex flex-1 flex-col gap-[var(--space-5)]"
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === "assistant"
                ? "max-w-[85%] self-start rounded-[var(--radius-md)] border border-line-soft bg-surface px-[var(--space-6)] py-[var(--space-5)] text-[var(--text-base)] text-ink whitespace-pre-wrap"
                : "max-w-[85%] self-end rounded-[var(--radius-md)] bg-[var(--line-faint)] px-[var(--space-6)] py-[var(--space-5)] text-[var(--text-base)] text-ink whitespace-pre-wrap"
            }
          >
            {message.content}
          </div>
        ))}
        {thinking ? (
          <p className="self-start text-[var(--text-sm)] text-ink-muted" aria-label={t.interviewThinking}>
            {t.interviewThinking}…
          </p>
        ) : null}
        <div ref={logEndRef} />
      </div>

      {error !== null ? (
        <div className="mt-[var(--space-6)] rounded-[var(--radius-md)] border border-line-soft bg-surface p-[var(--space-6)]">
          <p role="alert" className="text-[var(--text-sm)] text-ink">
            {error}
          </p>
          <div className="mt-[var(--space-5)] flex flex-wrap gap-[var(--space-5)]">
            <button
              type="button"
              onClick={handleRetry}
              disabled={streaming}
              className="focus-ring rounded-[var(--radius-md)] border border-line-strong bg-surface px-[var(--space-6)] py-[var(--space-4)] text-[var(--text-base)] text-ink-muted transition-colors duration-[var(--motion-fast)] hover:bg-[var(--line-faint)] disabled:opacity-60"
            >
              {t.interviewRetry}
            </button>
            <button
              type="button"
              onClick={handleSwitchToForm}
              disabled={switching}
              className="focus-ring rounded-[var(--radius-md)] bg-[var(--accent)] px-[var(--space-6)] py-[var(--space-4)] text-[var(--text-base)] font-[var(--weight-medium)] text-white transition-colors duration-[var(--motion-fast)] disabled:opacity-60"
            >
              {switching ? t.interviewSwitching : t.interviewSwitchToForm}
            </button>
          </div>
        </div>
      ) : null}

      {!complete && error === null ? (
        <div className="mt-[var(--space-6)] flex items-end gap-[var(--space-5)]">
          <label htmlFor="interview-input" className="sr-only">
            {t.interviewInputLabel}
          </label>
          <textarea
            id="interview-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            rows={2}
            disabled={streaming}
            placeholder={t.interviewInputLabel}
            className="focus-ring min-h-[44px] flex-1 resize-none rounded-[var(--radius-md)] border border-line-strong bg-paper px-[var(--space-6)] py-[var(--space-5)] text-[var(--text-base)] text-ink disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={streaming || input.trim().length === 0}
            className="focus-ring rounded-[var(--radius-md)] bg-[var(--accent)] px-[var(--space-7)] py-[var(--space-5)] text-[var(--text-base)] font-[var(--weight-medium)] text-white transition-colors duration-[var(--motion-fast)] disabled:opacity-60"
          >
            {streaming ? t.interviewSending : t.interviewSend}
          </button>
        </div>
      ) : null}
    </div>
  );
}
