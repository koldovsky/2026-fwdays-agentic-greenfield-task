"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell/AppShell";
import { uk } from "@/lib/i18n/uk";

function PlaceholderPanel({
  title,
  hint,
}: {
  title: string;
  hint: string;
}) {
  return (
    <div className="shell-placeholder">
      <p className="shell-placeholder__title">{title}</p>
      <p className="shell-placeholder__hint">{hint}</p>
    </div>
  );
}

/** @trace FR-SHELL-01 @trace FR-SHELL-02 @trace FR-SHELL-03 @trace FR-SHELL-04 @trace FR-I18N-01 */
export default function Home() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 600);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AppShell
      loading={loading}
      left={
        <PlaceholderPanel
          title={uk.shell.ratesColumnLabel}
          hint={uk.home.ratesPlaceholderHint}
        />
      }
      right={
        <PlaceholderPanel
          title={uk.shell.focusColumnLabel}
          hint={uk.home.focusPlaceholderHint}
        />
      }
    />
  );
}
