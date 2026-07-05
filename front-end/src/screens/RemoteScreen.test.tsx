import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RemoteScreen } from './RemoteScreen.tsx';
import type { Device } from '../data/types.ts';
import type { InputCatalogueEntry } from '../data/inputs.ts';
import type { ClientSessionState } from '../data/useDeviceSession.ts';

vi.mock('../data/useDeviceSession.ts', () => {
  const stub = vi.fn(() => ({
    state: mockState as ClientSessionState,
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
  }));
  return { useDeviceSession: stub };
});

vi.mock('../data/useVolume.ts', () => {
  const stub = vi.fn(() => ({
    level: null,
    muted: mockMuted,
    delta: mockVolumeDelta,
    toggleMute: mockVolumeToggle,
  }));
  return { useVolume: stub };
});

vi.mock('../data/useInputs.ts', () => {
  const stub = vi.fn(() => ({
    inputs: mockInputs,
    setInput: mockSetInput,
  }));
  return { useInputs: stub };
});

// Mutable ambient state the mocks read. Tests set these before render.
let mockState: ClientSessionState = 'Disconnected';
let mockMuted = false;
let mockVolumeDelta = vi.fn(async () => undefined);
let mockVolumeToggle = vi.fn(async () => undefined);
let mockInputs: readonly InputCatalogueEntry[] = [
  { id: 'KEY_SOURCE', label: 'Source picker' },
  { id: 'KEY_HDMI1', label: 'HDMI 1' },
];
let mockSetInput = vi.fn(async () => undefined);

function resetMocks() {
  mockMuted = false;
  mockVolumeDelta = vi.fn(async () => undefined);
  mockVolumeToggle = vi.fn(async () => undefined);
  mockInputs = [
    { id: 'KEY_SOURCE', label: 'Source picker' },
    { id: 'KEY_HDMI1', label: 'HDMI 1' },
  ];
  mockSetInput = vi.fn(async () => undefined);
}

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

describe('RemoteScreen', () => {
  it('renders every command control as disabled when the session is Connecting', () => {
    mockState = 'Connecting';
    mockMuted = false;
    mockVolumeDelta = vi.fn(async () => undefined);
    mockVolumeToggle = vi.fn(async () => undefined);
    const post = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <RemoteScreen device={device()} onBack={vi.fn()} sendKeyOptions={{ post }} />,
    );

    const labels = ['Up', 'Down', 'Left', 'Right', 'Select', 'Home', 'Menu', 'Power'];
    for (const label of labels) {
      const btn = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
      expect(btn, `expected a button with aria-label="${label}"`).not.toBeNull();
      expect(btn?.disabled).toBe(true);
    }

    const up = container.querySelector<HTMLButtonElement>('button[aria-label="Up"]');
    up?.click();
    expect(post).not.toHaveBeenCalled();
  });

  it('clicking the D-pad up arrow while Connected calls sendKey with KEY_UP', () => {
    mockState = 'Connected';
    mockMuted = false;
    mockVolumeDelta = vi.fn(async () => undefined);
    mockVolumeToggle = vi.fn(async () => undefined);
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

  it('renders the Slider without erroring and defaults to the local starting position', () => {
    mockState = 'Connected';
    mockMuted = false;
    mockVolumeDelta = vi.fn(async () => undefined);
    mockVolumeToggle = vi.fn(async () => undefined);
    const { container } = render(<RemoteScreen device={device()} onBack={vi.fn()} />);
    const range = container.querySelector<HTMLInputElement>('input[type="range"]');
    expect(range, 'slider input not found').not.toBeNull();
    expect(range?.disabled).toBe(false);
    // Default local slider position is 38 (per SLIDER_START in RemoteScreen.tsx).
    expect(Number(range?.value)).toBe(38);
  });

  it('renders volume_off with active prop when muted: true', () => {
    mockState = 'Connected';
    mockMuted = true;
    mockVolumeDelta = vi.fn(async () => undefined);
    mockVolumeToggle = vi.fn(async () => undefined);
    const { container } = render(<RemoteScreen device={device()} onBack={vi.fn()} />);
    const mute = container.querySelector<HTMLButtonElement>('button[aria-label="Mute"]');
    expect(mute, 'mute button not found').not.toBeNull();
    // DS IconButton renders the icon glyph as the button's text content.
    expect(mute?.textContent).toContain('volume_off');
    // `active` prop drives an inset shadow via var(--nm-inset-md).
    const shadow = mute?.style.boxShadow ?? '';
    expect(shadow).toContain('--nm-inset-md');
  });

  it('committing the slider while Connecting fires no delta call', () => {
    mockState = 'Connecting';
    mockMuted = false;
    mockVolumeDelta = vi.fn(async () => undefined);
    mockVolumeToggle = vi.fn(async () => undefined);
    const { container } = render(<RemoteScreen device={device()} onBack={vi.fn()} />);
    const range = container.querySelector<HTMLInputElement>('input[type="range"]');
    expect(range?.disabled).toBe(true);
    // Try to drive a change + commit; both should be no-ops.
    if (range) {
      fireEvent.change(range, { target: { value: '55' } });
      fireEvent.mouseUp(range);
      fireEvent.keyUp(range);
    }
    expect(mockVolumeDelta).not.toHaveBeenCalled();
  });

  it('committing the slider while Connected fires a delta call with the position diff', () => {
    mockState = 'Connected';
    mockMuted = false;
    mockVolumeDelta = vi.fn(async () => undefined);
    mockVolumeToggle = vi.fn(async () => undefined);
    const { container } = render(<RemoteScreen device={device()} onBack={vi.fn()} />);
    const range = container.querySelector<HTMLInputElement>('input[type="range"]');
    expect(range).not.toBeNull();
    // Drag from the default (38) up to 41.
    fireEvent.change(range!, { target: { value: '41' } });
    fireEvent.mouseUp(range!);
    expect(mockVolumeDelta).toHaveBeenCalledWith(3);
  });

  it('clicking mute while Connected calls toggleMute', () => {
    mockState = 'Connected';
    resetMocks();
    const { container } = render(<RemoteScreen device={device()} onBack={vi.fn()} />);
    const mute = container.querySelector<HTMLButtonElement>('button[aria-label="Mute"]');
    fireEvent.click(mute!);
    expect(mockVolumeToggle).toHaveBeenCalledTimes(1);
  });

  it('opening the inputs modal then flipping state to Connecting auto-closes it', () => {
    mockState = 'Connected';
    resetMocks();
    const { container, rerender } = render(
      <RemoteScreen device={device()} onBack={vi.fn()} />,
    );
    // Modal is closed initially; find and click the Inputs button.
    const inputsButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Inputs"]',
    );
    expect(inputsButton, 'Inputs button not found').not.toBeNull();
    fireEvent.click(inputsButton!);

    // After opening, the modal renders the input labels somewhere in the tree.
    expect(container.textContent ?? '').toContain('HDMI 1');

    // Flip the ambient state and force a re-render.
    mockState = 'Connecting';
    rerender(<RemoteScreen device={device()} onBack={vi.fn()} />);

    // The auto-close effect should have unmounted the modal — the input
    // labels should no longer be in the DOM.
    expect(container.textContent ?? '').not.toContain('HDMI 1');
  });
});
