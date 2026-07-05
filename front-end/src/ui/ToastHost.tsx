import { Toast } from '@ds/components/feedback/Toast.jsx';
import { useToastState } from './useToast.ts';

/**
 * Renders the active queue of toasts fixed to the bottom-right of the
 * viewport. On viewports narrower than 480 px the media-query pins the
 * stack to the bottom edge full-width — that layout policy lives here at
 * the SPA level (the DS `Toast` primitive is not viewport-aware; it's
 * one row). Reads state via `useToastState`, so a `ToastProvider` must
 * wrap this component.
 */
export function ToastHost() {
  const { toasts, dismiss, pause, resume } = useToastState();
  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        right: 'var(--space-8)',
        bottom: 'var(--space-8)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        zIndex: 1100,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <Toast
            tone={toast.tone}
            onDismiss={() => dismiss(toast.id)}
            onMouseEnter={() => pause(toast.id)}
            onMouseLeave={() => resume(toast.id)}
          >
            {toast.message}
          </Toast>
        </div>
      ))}
    </div>
  );
}
