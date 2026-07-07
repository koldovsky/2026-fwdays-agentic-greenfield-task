import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastHost } from './ToastHost.tsx';
import { ToastProvider, useToast } from './useToast.ts';

// Injected clock so we can drive the dedup window and auto-dismiss timer.
let mockNow = 0;
function now(): number {
  return mockNow;
}
let nextIdCounter = 0;
function nextId(): string {
  nextIdCounter += 1;
  return `toast-${nextIdCounter}`;
}

function TestHarness({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider nextId={nextId} now={now}>
      {children}
      <ToastHost />
    </ToastProvider>
  );
}

function usePushExposed(ref: { current: null | ((tone: 'info' | 'warning' | 'error', message: string) => void) }) {
  const { push } = useToast();
  ref.current = (tone, message) => push({ tone, message });
  return null;
}

beforeEach(() => {
  vi.useFakeTimers();
  mockNow = 0;
  nextIdCounter = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ToastHost + useToast', () => {
  it('pushing one toast renders one toast', () => {
    const pushRef: { current: null | ((tone: 'info' | 'warning' | 'error', message: string) => void) } = { current: null };
    const Push = () => usePushExposed(pushRef);
    const { container } = render(
      <TestHarness>
        <Push />
      </TestHarness>,
    );
    act(() => {
      pushRef.current!('error', 'first toast');
    });
    expect(container.querySelectorAll('[role="status"]').length).toBe(1);
    expect(container.textContent ?? '').toContain('first toast');
  });

  it('four consecutive pushes cap the visible stack at three', () => {
    const pushRef: { current: null | ((tone: 'info' | 'warning' | 'error', message: string) => void) } = { current: null };
    const Push = () => usePushExposed(pushRef);
    const { container } = render(
      <TestHarness>
        <Push />
      </TestHarness>,
    );
    act(() => {
      // Space them out beyond the dedup window so each push is accepted.
      mockNow = 1000;
      pushRef.current!('error', 'msg 1');
      mockNow = 2000;
      pushRef.current!('error', 'msg 2');
      mockNow = 3000;
      pushRef.current!('error', 'msg 3');
      mockNow = 4000;
      pushRef.current!('error', 'msg 4');
    });
    const toasts = container.querySelectorAll('[role="status"]');
    expect(toasts.length).toBe(3);
    // Oldest ("msg 1") should have been dropped.
    expect(container.textContent ?? '').not.toContain('msg 1');
    expect(container.textContent ?? '').toContain('msg 4');
  });

  it('identical messages within 500 ms are deduplicated', () => {
    const pushRef: { current: null | ((tone: 'info' | 'warning' | 'error', message: string) => void) } = { current: null };
    const Push = () => usePushExposed(pushRef);
    const { container } = render(
      <TestHarness>
        <Push />
      </TestHarness>,
    );
    act(() => {
      mockNow = 1000;
      pushRef.current!('error', 'same message');
      mockNow = 1200;
      pushRef.current!('error', 'same message');
    });
    expect(container.querySelectorAll('[role="status"]').length).toBe(1);
  });

  it('hovering a toast pauses its auto-dismiss timer', () => {
    const pushRef: { current: null | ((tone: 'info' | 'warning' | 'error', message: string) => void) } = { current: null };
    const Push = () => usePushExposed(pushRef);
    const { container } = render(
      <TestHarness>
        <Push />
      </TestHarness>,
    );
    act(() => {
      mockNow = 1000;
      pushRef.current!('error', 'hover me');
    });
    expect(container.querySelectorAll('[role="status"]').length).toBe(1);

    // Advance 2s (not enough to trigger the 5s auto-dismiss), then hover.
    act(() => {
      mockNow += 2000;
      vi.advanceTimersByTime(2000);
    });
    const toast = container.querySelector<HTMLElement>('[role="status"]');
    act(() => {
      fireEvent.mouseEnter(toast!);
    });

    // Advance well past the original 5s window while hovering — timer paused.
    act(() => {
      mockNow += 10_000;
      vi.advanceTimersByTime(10_000);
    });
    expect(container.querySelectorAll('[role="status"]').length).toBe(1);

    // Leave — the resume path should give it the *remaining* ms
    // (5000-2000 = 3000). Advance 4s → should now be gone.
    act(() => {
      fireEvent.mouseLeave(toast!);
    });
    act(() => {
      mockNow += 4000;
      vi.advanceTimersByTime(4000);
    });
    expect(container.querySelectorAll('[role="status"]').length).toBe(0);
  });
});
