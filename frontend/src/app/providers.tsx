"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

/**
 * Single-instance `QueryClient` for the static-export SPA. Constructed in a
 * `useState` so React strict-mode double-invocation does not produce two
 * clients. Default `staleTime` is 0 because the upload mutation is a one-off
 * and the SPA has no other queries in Phase 1.
 */
export function ClientProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 0, retry: false },
          mutations: { retry: false },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
