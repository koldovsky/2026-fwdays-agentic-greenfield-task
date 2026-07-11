/**
 * `useJobEvents` — native WebSocket consumer for the per-chunk progress
 * events emitted on `WS /api/v1/jobs/{id}/events` (D-03 + F5-AC5).
 *
 * Reconnect: 1000ms `setTimeout` on `onclose` — fixed delay, NO exponential
 * backoff (sprint path per CONTEXT.md agent-discretion; v2 hardens this).
 *
 * WS close codes (documented for future debugging; the SPA reconnects on
 * all codes per the sprint path — 1000 normal, 1008 policy = unknown
 * job_id, 1011 internal = backend error). FastAPI/Starlette passes the
 * code to `websocket.close(code=...)` on the server side; the client's
 * `onclose` receives the same numeric code.
 *
 * No replay buffer — late subscribers receive the next chunk event only
 * (per Phase 1 `JobProgressBus` contract). The first event is the
 * `running` event for the job; subsequent events arrive on each chunk
 * completion.
 */
import { useEffect, useRef, useState } from "react";

import type { JobProgressEvent } from "@/lib/api-contract";

/** WS base URL — derived from NEXT_PUBLIC_API_BASE. Static-export friendly. */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api/v1";
const WS_BASE = API_BASE.replace(/^http/, "ws");

export interface UseJobEventsState {
  /** Most recent progress event (null until the first event arrives). */
  event: JobProgressEvent | null;
  /** True while the WebSocket is in OPEN state. */
  isConnected: boolean;
  /** True after at least one `onclose` (reconnect attempt in flight). */
  isReconnecting: boolean;
  /** The most recent close code seen (null until first close). */
  lastCloseCode: number | null;
}

export function useJobEvents(jobId: string | null): UseJobEventsState {
  const [event, setEvent] = useState<JobProgressEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [lastCloseCode, setLastCloseCode] = useState<number | null>(null);

  // Refs hold the WebSocket + reconnect timer so the effect can mutate them
  // on `onclose` without re-creating the effect on every render.
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!jobId) {
      return;
    }
    cancelledRef.current = false;

    const connect = () => {
      if (cancelledRef.current) {
        return;
      }
      const url = `${WS_BASE}/jobs/${encodeURIComponent(jobId)}/events`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelledRef.current) {
          ws.close();
          return;
        }
        setIsConnected(true);
        setIsReconnecting(false);
      };

      ws.onmessage = (e: MessageEvent<string>) => {
        if (cancelledRef.current) {
          return;
        }
        try {
          const parsed = JSON.parse(e.data) as JobProgressEvent;
          setEvent(parsed);
        } catch {
          // Ignore malformed frames — the backend is the only emitter, so a
          // parse failure indicates a protocol mismatch, not user input.
        }
      };

      ws.onerror = () => {
        // The browser emits `onerror` immediately before `onclose` for
        // connection failures. The actual close code arrives on `onclose`;
        // we treat errors as transient and let the close handler reconnect.
      };

      ws.onclose = (ev: CloseEvent) => {
        setIsConnected(false);
        setLastCloseCode(ev.code);
        if (cancelledRef.current) {
          return;
        }
        setIsReconnecting(true);
        // Fixed 1000ms reconnect — sprint path per CONTEXT.md. v2 swaps
        // in exponential backoff. Reconnect on all close codes including
        // 1000 (server may close 1000 for non-error reasons; the SPA's
        // polling semantics re-establish on the next user action).
        timerRef.current = setTimeout(connect, 1000);
      };
    };

    connect();

    return () => {
      cancelledRef.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (wsRef.current) {
        // Detach handlers so the late-arriving close event doesn't trigger
        // a reconnect attempt after teardown.
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.onopen = null;
        if (
          wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING
        ) {
          wsRef.current.close();
        }
        wsRef.current = null;
      }
    };
  }, [jobId]);

  return { event, isConnected, isReconnecting, lastCloseCode };
}
