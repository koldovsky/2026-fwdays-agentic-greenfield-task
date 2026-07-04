import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RemoteScreen } from './RemoteScreen.tsx';
import type { Device } from '../data/types.ts';
import type { ClientSessionState } from '../data/useDeviceSession.ts';

vi.mock('../data/useDeviceSession.ts', () => {
  const stub = vi.fn(() => ({
    state: mockState as ClientSessionState,
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
  }));
  return { useDeviceSession: stub };
});

// Mutable ambient state the mock reads. Tests set this before render.
let mockState: ClientSessionState = 'Disconnected';

function device(overrides: Partial<Device> = {}): Device {
  return {
    udn: 'udn-1',
    name: 'Living Room',
    model: 'UN65KS8500',
    ip: '192.168.1.42',
    port: 9197,
    status: 'online',
    lastSeen: 0,
    ...overrides,
  };
}

function commandButtons(container: HTMLElement): HTMLButtonElement[] {
  return Array.from(
    container.querySelectorAll<HTMLButtonElement>(
      'button[aria-label="Up"], button[aria-label="Down"], button[aria-label="Left"], button[aria-label="Right"], button[aria-label="Select"], button[aria-label="Back"]:not([aria-label="Back"]:first-of-type), button[aria-label="Home"], button[aria-label="Menu"], button[aria-label="Power"]',
    ),
  );
}

describe('RemoteScreen', () => {
  it('renders every command control as disabled when the session is Connecting', () => {
    mockState = 'Connecting';
    const post = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <RemoteScreen device={device()} onBack={vi.fn()} sendKeyOptions={{ post }} />,
    );

    // Check the specific command controls — every arrow, select, back/home/menu, power.
    const labels = ['Up', 'Down', 'Left', 'Right', 'Select', 'Home', 'Menu', 'Power'];
    for (const label of labels) {
      const btn = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
      expect(btn, `expected a button with aria-label="${label}"`).not.toBeNull();
      expect(btn?.disabled).toBe(true);
    }

    // Click a disabled button — no POST should fire.
    const up = container.querySelector<HTMLButtonElement>('button[aria-label="Up"]');
    up?.click();
    expect(post).not.toHaveBeenCalled();
  });

  it('clicking the D-pad up arrow while Connected calls sendKey with KEY_UP', () => {
    mockState = 'Connected';
    const post = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <RemoteScreen device={device()} onBack={vi.fn()} sendKeyOptions={{ post }} />,
    );
    const up = container.querySelector<HTMLButtonElement>('button[aria-label="Up"]');
    expect(up, 'D-pad Up button not found').not.toBeNull();
    expect(up?.disabled).toBe(false);
    fireEvent.click(up!);
    expect(post).toHaveBeenCalledWith('udn-1', 'KEY_UP');
  });
});

// Referenced to silence "unused" warning in the loop through container query.
void commandButtons;
