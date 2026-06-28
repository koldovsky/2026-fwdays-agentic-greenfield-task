"use client";

import { useState, useEffect } from "react";
import { uk } from "@/lib/i18n/uk";

function pickJoke(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return uk.jokes[dayOfYear % uk.jokes.length];
}

export function BottomJokes() {
  // null on first render (server + client hydration) → no hydration mismatch.
  // setState is called only inside a setTimeout callback, satisfying the
  // react-hooks/set-state-in-effect rule.
  const [joke, setJoke] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setJoke(pickJoke()), 0);
    return () => clearTimeout(id);
  }, []);

  return (
    <p
      aria-label={uk.regions.footer}
      className="m-0 min-h-5 max-w-[540px] flex-1 text-sm text-text-secondary"
    >
      {joke}
    </p>
  );
}
