import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSendKey } from './useSendKey.ts';
import { ApiError } from '../api/client.ts';
import { ToastProvider } from '../ui/useToast.ts';
import { ToastHost } from '../ui/ToastHost.tsx';

/**
 * `useSendKey` failing with an `ApiError` should (a) re-throw the error
 * so the caller can react and (b) push a matching toast so the user
 * gets copy for the failure. Verified end-to-end through the real
 * `ToastProvider` + `ToastHost` since the failure surfacing is the
 * whole point of `error-surfacing`.
 */
function Harness({
  onSend,
  postFail,
}: {
  onSend: (send: (k: 'KEY_UP' | 'KEY_HOME' | 'KEY_MENU') => Promise<void>) => void;
  postFail: () => Promise<void>;
}) {
  const { sendKey } = useSendKey('udn-1', {
    post: async () => {
      await postFail();
    },
  });
  onSend(sendKey);
  return null;
}

describe('useSendKey error surfacing', () => {
  it('failing with TvNotSupported re-throws AND surfaces a warning toast', async () => {
    let capturedError: unknown = null;
    let sendKey: ((k: 'KEY_UP' | 'KEY_HOME' | 'KEY_MENU') => Promise<void>) | null = null;

    const postFail = vi.fn(async () => {
      throw new ApiError('TvNotSupported', 'raw wire message', 'corr-1');
    });

    const { container } = render(
      <ToastProvider>
        <Harness onSend={(fn) => (sendKey = fn)} postFail={postFail} />
        <ToastHost />
      </ToastProvider>,
    );

    await act(async () => {
      try {
        await sendKey!('KEY_HOME');
      } catch (err) {
        capturedError = err;
      }
    });

    // (a) The error is re-thrown so callers can react.
    expect(capturedError).toBeInstanceOf(ApiError);
    expect((capturedError as ApiError).code).toBe('TvNotSupported');

    // (b) A warning toast appears. Message must be the friendly copy,
    //     not the raw wire message.
    const toasts = container.querySelectorAll('[role="status"]');
    expect(toasts.length).toBe(1);
    const text = container.textContent ?? '';
    expect(text).toContain("doesn't support");
    expect(text).not.toContain('raw wire message');
  });
});
