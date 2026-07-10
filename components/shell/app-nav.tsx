"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function extractTaskId(pathname: string): string | undefined {
  const taskMatch = pathname.match(/^\/tasks\/([^/]+)$/);
  if (taskMatch) {
    return taskMatch[1];
  }

  const focusMatch = pathname.match(/^\/focus\/([^/]+)$/);
  return focusMatch?.[1];
}

function navLinkClass(isActive: boolean) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
    isActive
      ? "bg-accent-subtle text-accent"
      : "text-foreground-muted hover:bg-surface-muted hover:text-foreground"
  }`;
}

export function AppNav() {
  const pathname = usePathname();
  const taskId = extractTaskId(pathname);
  const isHome = pathname === "/";
  const isRecap = pathname === "/recap";
  const isTaskDetail = pathname.startsWith("/tasks/");

  return (
    <nav aria-label="Main navigation" className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-2xl items-center gap-1 px-4 py-3 sm:px-6">
        <Link href="/" className={navLinkClass(isHome)} aria-current={isHome ? "page" : undefined}>
          Home
        </Link>
        {taskId ? (
          <Link
            href={`/tasks/${taskId}`}
            className={navLinkClass(isTaskDetail)}
            aria-current={isTaskDetail ? "page" : undefined}
          >
            Task
          </Link>
        ) : null}
        {taskId ? (
          <Link
            href={`/focus/${taskId}`}
            className={navLinkClass(pathname.startsWith("/focus/"))}
          >
            Focus
          </Link>
        ) : null}
        <Link
          href="/recap"
          className={navLinkClass(isRecap)}
          aria-current={isRecap ? "page" : undefined}
        >
          Recap
        </Link>
      </div>
    </nav>
  );
}
