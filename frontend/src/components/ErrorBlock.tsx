/**
 * ErrorBlock — inline dismissable error region under the dropzone.
 *
 * Visual contract: 01-UI-SPEC.md §Color (red-50 background, red-200 border,
 * red-600 text + 'Try again' link, hover red-700) + §Copywriting (mapped
 * by `code` to one of the four error-state rows). `role="alert"` so screen
 * readers announce the message; the dismiss × has a 24×24 hit area and
 * `aria-label="Dismiss error"`.
 */
"use client";

import { useId } from "react";

import { ErrorCode } from "@/lib/api-contract";

import "./ErrorBlock.css";

export interface ErrorBlockProps {
  code: string;
  message: string;
  onDismiss: () => void;
  onRetry: () => void;
}

const COPY: Record<string, string> = {
  [ErrorCode.InvalidEpub]: "That file isn't a valid EPUB 2.0/3.0 archive. Try a different file.",
  [ErrorCode.FileTooLarge]: "That file is larger than 50 MB. Choose a smaller file.",
  network: "Couldn't reach the server. Check your connection and try again.",
};

const FALLBACK_COPY = "Something went wrong. Please try again.";

export function ErrorBlock({ code, message, onDismiss, onRetry }: ErrorBlockProps) {
  const titleId = useId();
  const copy = COPY[code] ?? message ?? FALLBACK_COPY;

  return (
    <div
      className="error-block"
      role="alert"
      aria-labelledby={titleId}
      data-testid="error-block"
      data-error-code={code}
    >
      <div className="error-block__body">
        <p id={titleId} className="error-block__title">
          {copy}
        </p>
        <button
          type="button"
          className="error-block__retry"
          onClick={onRetry}
          data-testid="error-retry"
        >
          Try again
        </button>
      </div>
      <button
        type="button"
        className="error-block__dismiss"
        onClick={onDismiss}
        aria-label="Dismiss error"
        data-testid="error-dismiss"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
