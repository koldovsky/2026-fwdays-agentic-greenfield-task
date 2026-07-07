"use client";

// apps/dashboard/components/ds — QuestionInbox (kb-learning tasks.md
// E.6/E.7, design.md Decision 2, `@trace FR-KB-02`, `@trace FR-KB-03`,
// `@trace FR-KB-04`).
//
// Self-fetching (design.md Decision 2's own "not folded into
// STATE_SNAPSHOT" call — no props, no server-rendered initial data threaded
// in): fetches `GET /api/questions` on mount and again after every mutating
// action it performs (answer submit, retry click). An open row renders an
// inline answer form that POSTs `{answer}` to `/api/questions/:id`; an
// `answered`+`delivery_status='failed'` row renders visually distinct (a
// non-color-only failure indicator, per the S3/S4 a11y lesson) with a retry
// action and NO answer form.

import { useEffect, useState } from "react";
import { Button } from "./Button.tsx";
import { EmptyState } from "./EmptyState.tsx";
import { Input } from "./Input.tsx";

interface QuestionRow {
  id: number;
  text: string;
  status: "open" | "answered";
  delivery_status: "pending" | "delivered" | "failed";
  admin_answer: string | null;
  answer_source: "kb" | "unanswered";
}

interface AnswerResponse {
  status?: string;
  code?: string;
  message?: string;
  question?: QuestionRow;
}

const FALLBACK_ANSWER_ERROR = "Не вдалося надіслати відповідь. Спробуйте ще раз.";
const FALLBACK_RETRY_ERROR = "Не вдалося повторити надсилання. Спробуйте ще раз.";
const RETRY_APPLIED_MESSAGE = "Відповідь повторно надіслано ліду.";
const FETCH_ERROR_MESSAGE = "Не вдалося завантажити список питань. Спробуйте оновити сторінку.";

function extractMessage(body: unknown, fallback: string): string {
  if (
    body !== null &&
    typeof body === "object" &&
    typeof (body as { message?: unknown }).message === "string"
  ) {
    return (body as { message: string }).message;
  }
  return fallback;
}

async function readJson(response: { json: () => Promise<unknown> }): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function QuestionRowAnswerForm({
  question,
  onAnswered,
}: {
  question: QuestionRow;
  onAnswered: (id: number) => void;
}) {
  const [answer, setAnswer] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/questions/${question.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      const body = (await readJson(response)) as AnswerResponse | null;
      if (response.ok && body?.status === "applied") {
        onAnswered(question.id);
        return;
      }
      setError(extractMessage(body, FALLBACK_ANSWER_ERROR));
    } catch {
      setError(FALLBACK_ANSWER_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={answer}
        placeholder="Введіть відповідь…"
        disabled={pending}
        onChange={(event) => setAnswer(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={pending} onClick={() => void handleSubmit()}>
          Надіслати
        </Button>
      </div>
      {error !== null ? (
        <p role="alert" className="text-sm text-[color:var(--status-declined-fg)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function FailedRowRetry({ question }: { question: QuestionRow }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRetry() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/questions/${question.id}/retry`, { method: "POST" });
      const body = (await readJson(response)) as AnswerResponse | null;
      if (response.ok && body?.status === "applied") {
        setMessage(RETRY_APPLIED_MESSAGE);
      } else {
        setMessage(extractMessage(body, FALLBACK_RETRY_ERROR));
      }
    } catch {
      setMessage(FALLBACK_RETRY_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p
        className="text-sm font-medium"
        style={{ color: "var(--status-declined-fg)" }}
      >
        ✕ Не вдалося надіслати відповідь ліду
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={pending} onClick={() => void handleRetry()}>
          Повторити надсилання
        </Button>
      </div>
      {message !== null ? (
        <p role="status" aria-live="polite" className="text-sm text-text-secondary">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function QuestionInbox() {
  const [questions, setQuestions] = useState<QuestionRow[] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    void loadQuestions();
    // Fetch once on mount only — this panel is interaction-driven, not a
    // live-push subscriber (design.md Decision 2's closing note).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadQuestions() {
    try {
      const response = await fetch("/api/questions");
      const body = (await readJson(response)) as unknown;
      if (!response.ok || !Array.isArray(body)) {
        setFetchError(FETCH_ERROR_MESSAGE);
        return;
      }
      setFetchError(null);
      setQuestions(body as QuestionRow[]);
    } catch {
      setFetchError(FETCH_ERROR_MESSAGE);
    }
  }

  function removeQuestion(id: number) {
    setQuestions((current) => (current ?? []).filter((question) => question.id !== id));
  }

  if (fetchError !== null && questions === null) {
    return (
      <p role="alert" className="text-sm text-[color:var(--status-declined-fg)]">
        {fetchError}
      </p>
    );
  }

  if (questions === null) {
    return null;
  }

  if (questions.length === 0) {
    return <EmptyState message="Питань поки немає" icon="chat" />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {questions.map((question) => {
        const isFailed = question.status === "answered" && question.delivery_status === "failed";
        return (
          <li
            key={question.id}
            className={`flex flex-col gap-3 rounded-lg border p-4 ${
              isFailed ? "border-dashed" : "border-border bg-surface"
            }`}
            style={
              isFailed
                ? { borderColor: "var(--status-declined-solid)", backgroundColor: "var(--status-declined-bg)" }
                : undefined
            }
          >
            <p className="text-sm font-medium text-text">{question.text}</p>
            {isFailed ? (
              <FailedRowRetry question={question} />
            ) : (
              <QuestionRowAnswerForm question={question} onAnswered={removeQuestion} />
            )}
          </li>
        );
      })}
    </ul>
  );
}
