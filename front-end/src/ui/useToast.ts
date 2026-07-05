import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';

export type ToastTone = 'info' | 'warning' | 'error';

export interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
  createdAt: number;
  /** Set when the toast is hovered; auto-dismiss timer pauses until leave. */
  pausedAt?: number;
  /** Remaining ms until auto-dismiss when unpaused. */
  remainingMs: number;
}

export interface PushInput {
  tone: ToastTone;
  message: string;
}

export interface ToastContextValue {
  toasts: readonly Toast[];
  push: (input: PushInput) => void;
  dismiss: (id: string) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
}

const AUTO_DISMISS_MS = 5_000;
const DEDUP_WINDOW_MS = 500;
const MAX_TOASTS = 3;

type Action =
  | { type: 'push'; input: PushInput; now: number; id: string }
  | { type: 'dismiss'; id: string }
  | { type: 'pause'; id: string; now: number }
  | { type: 'resume'; id: string; now: number };

interface State {
  toasts: Toast[];
}

function reduce(state: State, action: Action): State {
  switch (action.type) {
    case 'push': {
      // Dedup: identical message within DEDUP_WINDOW_MS is dropped.
      const recentDupe = state.toasts.find(
        (t) =>
          t.message === action.input.message &&
          action.now - t.createdAt < DEDUP_WINDOW_MS,
      );
      if (recentDupe) return state;
      const toast: Toast = {
        id: action.id,
        tone: action.input.tone,
        message: action.input.message,
        createdAt: action.now,
        remainingMs: AUTO_DISMISS_MS,
      };
      const next = [...state.toasts, toast];
      // Cap at MAX_TOASTS — drop oldest.
      if (next.length > MAX_TOASTS) next.splice(0, next.length - MAX_TOASTS);
      return { toasts: next };
    }
    case 'dismiss':
      return { toasts: state.toasts.filter((t) => t.id !== action.id) };
    case 'pause':
      return {
        toasts: state.toasts.map((t) =>
          t.id === action.id && !t.pausedAt ? { ...t, pausedAt: action.now } : t,
        ),
      };
    case 'resume':
      return {
        toasts: state.toasts.map((t) => {
          if (t.id !== action.id || !t.pausedAt) return t;
          const elapsed = t.pausedAt - t.createdAt;
          const remaining = Math.max(0, t.remainingMs - elapsed);
          // Restart the "countdown" from resume time by resetting createdAt.
          return {
            ...t,
            createdAt: action.now,
            pausedAt: undefined,
            remainingMs: remaining,
          };
        }),
      };
    default:
      return state;
  }
}

const ToastContext = createContext<ToastContextValue | null>(null);

export interface ToastProviderProps {
  children: ReactNode;
  /** Injectable for tests. Defaults to `crypto.randomUUID()` / fallback. */
  nextId?: () => string;
  /** Injectable for tests. Defaults to `Date.now()`. */
  now?: () => number;
}

export function ToastProvider({ children, nextId, now }: ToastProviderProps) {
  const [state, dispatch] = useReducer(reduce, { toasts: [] });

  const idRef = useRef(0);
  const generateId = useCallback((): string => {
    if (nextId) return nextId();
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    idRef.current += 1;
    return `toast-${idRef.current}`;
  }, [nextId]);

  const clock = useCallback((): number => (now ? now() : Date.now()), [now]);

  const push = useCallback(
    (input: PushInput) => {
      dispatch({ type: 'push', input, now: clock(), id: generateId() });
    },
    [clock, generateId],
  );

  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'dismiss', id });
  }, []);

  const pause = useCallback(
    (id: string) => {
      dispatch({ type: 'pause', id, now: clock() });
    },
    [clock],
  );

  const resume = useCallback(
    (id: string) => {
      dispatch({ type: 'resume', id, now: clock() });
    },
    [clock],
  );

  // Auto-dismiss: schedule a per-toast timer for whatever remainingMs is
  // left, keyed by `toast.createdAt` so a resume that resets `createdAt`
  // re-runs this effect and refreshes the timer.
  useEffect(() => {
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    for (const toast of state.toasts) {
      if (toast.pausedAt) continue;
      const timer = setTimeout(() => {
        dispatch({ type: 'dismiss', id: toast.id });
      }, toast.remainingMs);
      timers.push(timer);
    }
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [state.toasts]);

  const value: ToastContextValue = {
    toasts: state.toasts,
    push,
    dismiss,
    pause,
    resume,
  };

  return createElement(ToastContext.Provider, { value }, children);
}

/**
 * `useToast()` returns `{ push, dismiss }` for pushing toasts from any
 * hook or component below the `ToastProvider` in the tree. Fires a
 * console warning + no-ops if called outside the provider (so tests that
 * don't wrap don't crash).
 */
export function useToast(): Pick<ToastContextValue, 'push' | 'dismiss'> {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      push: () => {
        console.warn('useToast: called outside ToastProvider — no-op');
      },
      dismiss: () => {},
    };
  }
  return { push: ctx.push, dismiss: ctx.dismiss };
}

/** Internal: for `ToastHost` to read state. Do not use in feature code. */
export function useToastState(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToastState must be used within a ToastProvider');
  }
  return ctx;
}
