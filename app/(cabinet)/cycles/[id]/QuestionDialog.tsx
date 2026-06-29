"use client";
// @trace FR-PROGRESS-03 NFR-A11Y-02

import { useState } from "react";
import { z } from "zod";
import { uk } from "@/lib/i18n/uk";

const dialogSchema = z.object({
  messages: z.array(z.object({ role: z.enum(["assistant", "user"]), content: z.string() })),
});

type DialogMessage = { role: "assistant" | "user"; content: string };

const t = uk.cycles.results;

/**
 * On-demand raw AI-dialog viewer for one question (FR-PROGRESS-03). Rendered
 * only for a question answered via the AI interview. The transcript is fetched
 * lazily on first expand — never eagerly for every question — and only the
 * authenticated HR cabinet can load it (endpoint is HR-auth-gated).
 */
export function QuestionDialog({ cycleId, questionId }: { cycleId: string; questionId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<DialogMessage[] | null>(null);
  const [error, setError] = useState(false);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (messages !== null || loading) return;

    setLoading(true);
    setError(false);
    try {
      const response = await fetch(
        `/api/cycles/${cycleId}/dialog?questionId=${encodeURIComponent(questionId)}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        setError(true);
        return;
      }
      const data: unknown = await response.json();
      const parsed = dialogSchema.safeParse(data);
      if (parsed.success) setMessages(parsed.data.messages);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-[var(--space-5)]">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-expanded={open}
        className="focus-ring rounded-[var(--radius-sm)] text-[var(--text-sm)] text-ink-muted underline underline-offset-2 hover:text-ink"
      >
        {open ? t.hideDialog : t.showDialog}
      </button>

      {open ? (
        <div className="mt-[var(--space-4)] flex flex-col gap-[var(--space-4)] rounded-[var(--radius-md)] border border-line-soft bg-paper p-[var(--space-6)]">
          {loading ? <p className="text-[var(--text-sm)] text-ink-muted">{t.dialogLoading}</p> : null}
          {error ? (
            <p role="alert" className="text-[var(--text-sm)] text-[var(--danger-ink)]">
              {t.dialogError}
            </p>
          ) : null}
          {messages?.map((message, index) => (
            <div key={index} className="text-[var(--text-sm)]">
              <span className="font-[var(--weight-medium)] text-ink-muted">
                {message.role === "assistant" ? t.roleAssistant : t.roleRespondent}:
              </span>{" "}
              <span className="whitespace-pre-wrap text-ink">{message.content}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
