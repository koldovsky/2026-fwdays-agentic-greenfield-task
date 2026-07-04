"use client";

import { useEffect } from "react";
import { IconCheck, IconX } from "@/components/icons";

const AUTO_DISMISS_MS = 3000;

type ToastProps = {
  message: string;
  onDismiss: () => void;
};

export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    const timeout = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timeout);
  }, [onDismiss]);

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit items-center gap-2 rounded-[var(--radius-md)] px-4 py-2.5 text-sm"
      style={{
        background: "var(--gray-900)",
        color: "#fff",
        boxShadow: "var(--shadow-4)",
      }}
    >
      <IconCheck width={16} height={16} style={{ color: "var(--color-success)" }} />
      <span>{message}</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="inline-flex border-none bg-transparent p-0.5"
        style={{ color: "rgba(255,255,255,0.6)", cursor: "pointer" }}
      >
        <IconX width={14} height={14} />
      </button>
    </div>
  );
}
