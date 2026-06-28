"use client";
// @trace FR-LINK-02

import { useState, useRef, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { uk } from "@/lib/i18n/uk";

const t = uk.respondent;

type Props = {
  token: string;
};

/**
 * Inline "Copy respondent link" button (FR-LINK-02). Constructs the full URL
 * client-side so no server-side origin is needed. Shows a transient confirmation
 * for 2 s, then resets. On clipboard failure shows an inline error message.
 * Never exposes the cycle DB id — only the opaque token string.
 */
export function CopyLinkButton({ token }: Props) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  async function handleClick() {
    clearTimeout(timerRef.current);
    const url = window.location.origin + "/respond/" + token;
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
      timerRef.current = setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      timerRef.current = setTimeout(() => setState("idle"), 3000);
    }
  }

  const label =
    state === "copied" ? t.linkCopied : state === "error" ? t.copyFailed : t.copyLink;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="focus-ring inline-flex items-center gap-[var(--space-3)] rounded-[var(--radius-md)] border border-line-strong bg-paper px-[var(--space-5)] py-[var(--space-4)] text-[var(--text-sm)] text-ink hover:bg-surface"
    >
      {state === "copied" ? (
        <Check size={14} aria-hidden="true" />
      ) : (
        <Copy size={14} aria-hidden="true" />
      )}
      {label}
    </button>
  );
}
