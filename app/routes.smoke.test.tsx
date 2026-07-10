import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

import HomePage from "@/app/(shell)/page";
import RecapPage from "@/app/(shell)/recap/page";
import FocusSessionPage from "@/app/focus/[taskId]/page";
import TaskDetailPage from "@/app/(shell)/tasks/[id]/page";
import { getBrowserStorage, resetBrowserStorageForTests } from "@/lib/storage/browser";
import { createTask } from "@/lib/tasks/create-task";

describe("route smoke tests", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    resetBrowserStorageForTests();
    getBrowserStorage().clear();
  });

  it("renders Today Home at /", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /Good (morning|afternoon|evening)/,
    );
    expect(screen.getByLabelText("Recommended task")).toBeInTheDocument();
    expect(screen.getByLabelText("Quick add task")).toBeInTheDocument();
    expect(screen.getByLabelText("Today recap")).toBeInTheDocument();
  });

  it("renders task detail at /tasks/[id]", async () => {
    const task = createTask({ title: "Reply to email" });
    getBrowserStorage().upsertTask(task);

    const page = await TaskDetailPage({
      params: Promise.resolve({ id: task.id }),
    });
    render(page);

    expect(
      screen.getByRole("heading", { level: 1, name: "Task detail" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Reply to email");
    expect(
      screen.getByLabelText("Why does this matter to me?"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("renders daily recap at /recap", () => {
    render(<RecapPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Daily recap" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Daily summary")).toBeInTheDocument();
    expect(screen.getByText("Minutes focused")).toBeInTheDocument();
    expect(screen.getByLabelText("Reflection tags")).toBeInTheDocument();
  });

  it("renders focus session at /focus/[taskId] without app shell nav", async () => {
    const task = createTask({ title: "Write weekly report" });
    getBrowserStorage().upsertTask(task);

    const page = await FocusSessionPage({
      params: Promise.resolve({ taskId: task.id }),
    });
    render(page);

    expect(
      screen.getByRole("heading", { name: "Choose a duration" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Main navigation")).not.toBeInTheDocument();
  });
});
