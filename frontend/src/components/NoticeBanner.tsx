"use client";

/**
 * NoticeBanner — inline info banner with optional "Copy command" button
 * (D-09). Non-blocking: the parent form remains submittable while the
 * banner is visible.
 *
 * Tones:
 *   - `info` (default) — neutral install hint
 *   - `warning` — soft warning
 *   - `error` — failed-job error message
 *
 * The "Copy command" button writes `copyText` to the clipboard via
 * `navigator.clipboard.writeText` and switches its label to "Copied!"
 * for 2s.
 */

import { useEffect, useState } from "react";

import "./NoticeBanner.css";

export type NoticeTone = "info" | "warning" | "error";

export interface NoticeBannerProps {
  tone?: NoticeTone;
  message: string;
  /** Optional copy-to-clipboard text. When set, a "Copy command" button is rendered. */
  copyText?: string;
  /** Optional dismiss handler — renders an × close button. */
  onDismiss?: () => void;
  /** data-testid for the banner root. */
  testId?: string;
}

export function NoticeBanner({
  tone = "info",
  message,
  copyText,
  onDismiss,
  testId = "nltk-notice",
}: NoticeBannerProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <div
      className={`notice notice--${tone}`}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      data-testid={testId}
      data-tone={tone}
    >
      <span className="notice__message">{message}</span>
      {copyText ? (
        <button
          type="button"
          className="notice__copy"
          onClick={handleCopy}
          data-testid="nltk-copy-button"
          aria-label="Copy install command to clipboard"
        >
          {copied ? "Copied!" : copyFailed ? "Copy failed" : "Copy command"}
        </button>
      ) : null}
      {onDismiss ? (
        <button
          type="button"
          className="notice__dismiss"
          onClick={onDismiss}
          aria-label="Dismiss notice"
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </div>
  );
}
