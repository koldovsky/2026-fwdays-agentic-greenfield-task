"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell/AppShell";

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

/** @trace FR-SHELL-01 @trace FR-SHELL-02 @trace FR-SHELL-03 @trace FR-SHELL-04 */
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
          title="Список курсів"
          hint="Тут з’явиться офіційний перелік валют НБУ."
        />
      }
      right={
        <PlaceholderPanel
          title="Обрана валюта"
          hint="Тут буде курс, конвертер і динаміка обраної валюти."
        />
      }
    />
  );
}
