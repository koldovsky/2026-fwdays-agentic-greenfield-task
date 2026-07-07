// @vitest-environment jsdom
// Test-first (red): `QuestionInbox` is a typed minimal stub (kb-learning
// tasks.md E.6's red half) — every test below is expected to FAIL against
// the stub until the GREEN pass (E.7) implements the real self-fetching
// panel. Mirrors `DecisionBar.test.tsx`'s own shape: `vi.stubGlobal("fetch",
// ...)`, RTL `render`/`screen`/`waitFor`, role-based queries, `cleanup()` in
// `afterEach`.

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { QuestionInbox } from "./QuestionInbox.tsx";

interface FakeQuestionRow {
  id: number;
  text: string;
  status: "open" | "answered";
  delivery_status: "pending" | "delivered" | "failed";
  admin_answer: string | null;
  answer_source: "kb" | "unanswered";
}

function openQuestion(id: number, text: string): FakeQuestionRow {
  return {
    id,
    text,
    status: "open",
    delivery_status: "pending",
    admin_answer: null,
    answer_source: "unanswered",
  };
}

function failedQuestion(id: number, text: string): FakeQuestionRow {
  return {
    id,
    text,
    status: "answered",
    delivery_status: "failed",
    admin_answer: "Так, є.",
    answer_source: "unanswered",
  };
}

function jsonResponse(
  body: unknown,
  ok = true,
): { ok: boolean; status: number; json: () => Promise<unknown> } {
  return { ok, status: ok ? 200 : 400, json: async () => body };
}

describe("QuestionInbox (kb-learning tasks.md E.6, design.md Decision 2)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  // @trace FR-KB-02
  it("renders an explicit EmptyState when the inbox is empty, never a blank area", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    render(<QuestionInbox />);

    await waitFor(() => {
      expect(fetchMock.mock.calls.some((call) => call[0] === "/api/questions")).toBe(true);
    });
    await waitFor(() => {
      expect(screen.getByText(/питань поки немає|немає (відкритих )?(питань|запитань)/i)).toBeInTheDocument();
    });
    // Never a raw blank placeholder with zero rendered content.
    expect(screen.queryByTestId("question-inbox-stub")).not.toBeInTheDocument();
  });

  // @trace FR-KB-02
  it("renders every open question, newest-first (the fetch response's own order)", async () => {
    const rows = [
      openQuestion(3, "чи можна групове заняття?"),
      openQuestion(2, "скільки коштує заняття?"),
      openQuestion(1, "чи є у вас парковка?"),
    ];
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(rows));
    vi.stubGlobal("fetch", fetchMock);

    render(<QuestionInbox />);

    await waitFor(() => {
      expect(screen.getByText("чи є у вас парковка?")).toBeInTheDocument();
    });
    const first = screen.getByText(rows[0]!.text);
    const second = screen.getByText(rows[1]!.text);
    const third = screen.getByText(rows[2]!.text);

    // `compareDocumentPosition`'s `DOCUMENT_POSITION_FOLLOWING` (4) bit is
    // set on the return value when the argument node comes AFTER the node
    // `compareDocumentPosition` was called on.
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(second.compareDocumentPosition(third) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // @trace FR-KB-04
  it("renders an answered+failed row visually distinct from an open row, with a retry action and NO answer form", async () => {
    const rows = [failedQuestion(5, "чи є знижка?")];
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(rows));
    vi.stubGlobal("fetch", fetchMock);

    render(<QuestionInbox />);

    await waitFor(() => {
      expect(screen.getByText("чи є знижка?")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /повторити|retry/i })).toBeInTheDocument();
    // No answer form for an already-answered row.
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /надіслати|відповісти/i })).not.toBeInTheDocument();
    // Visually distinct: a failure-indicating message is present.
    expect(screen.getByText(/не вдалося|помилка доставки|не доставлено/i)).toBeInTheDocument();
  });

  // @trace FR-KB-03
  it("submitting an answer POSTs {answer} to /api/questions/:id and removes the row from local state on success", async () => {
    const rows = [openQuestion(9, "чи є у вас парковка?")];
    const fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url === "/api/questions") return Promise.resolve(jsonResponse(rows));
      if (url === "/api/questions/9" && options?.method === "POST") {
        return Promise.resolve(
          jsonResponse({ status: "applied", question: { ...rows[0], status: "answered" } }),
        );
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<QuestionInbox />);
    await waitFor(() => {
      expect(screen.getByText("чи є у вас парковка?")).toBeInTheDocument();
    });

    await user.type(screen.getByRole("textbox"), "Так, є безкоштовна парковка.");
    await user.click(screen.getByRole("button", { name: /надіслати|відповісти/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/questions/9",
        expect.objectContaining({ method: "POST" }),
      );
    });
    await waitFor(() => {
      expect(screen.queryByText("чи є у вас парковка?")).not.toBeInTheDocument();
    });
  });

  // @trace FR-KB-03
  it("shows an inline error on an invalid-shaped answer response, never crashes, and keeps the row present", async () => {
    const rows = [openQuestion(11, "яка вартість занять?")];
    const fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url === "/api/questions") return Promise.resolve(jsonResponse(rows));
      if (url === "/api/questions/11" && options?.method === "POST") {
        return Promise.resolve(
          jsonResponse({ status: "invalid", code: "EMPTY", message: "Введіть відповідь." }, false),
        );
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<QuestionInbox />);
    await waitFor(() => {
      expect(screen.getByText("яка вартість занять?")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /надіслати|відповісти/i }));

    await waitFor(() => {
      expect(screen.getByText(/введіть відповідь/i)).toBeInTheDocument();
    });
    // Row stays present — never crashed, never silently removed on failure.
    expect(screen.getByText("яка вартість занять?")).toBeInTheDocument();
  });

  // @trace FR-KB-04
  it("clicking retry POSTs to the retry route and shows the outcome message", async () => {
    const rows = [failedQuestion(21, "чи є у вас парковка?")];
    const fetchMock = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url === "/api/questions") return Promise.resolve(jsonResponse(rows));
      if (url === "/api/questions/21/retry" && options?.method === "POST") {
        return Promise.resolve(jsonResponse({ status: "applied" }));
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<QuestionInbox />);
    await waitFor(() => {
      expect(screen.getByText("чи є у вас парковка?")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /повторити|retry/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/questions/21/retry",
        expect.objectContaining({ method: "POST" }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText(/надіслано|повторно надіслано|доставлено|успішно/i)).toBeInTheDocument();
    });
  });
});
