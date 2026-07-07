import { fireEvent, render, waitFor } from '@testing-library/react';
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

vi.mock('../data/useBrowserLaunch.ts', () => {
  const stub = vi.fn(() => ({
    launch: mockBrowserLaunch,
    isPending: mockBrowserPending,
  }));
  return { useBrowserLaunch: stub };
});

// Mutable ambient state the mocks read. Tests set these before render.
let mockState: ClientSessionState = 'Disconnected';
let mockMuted = false;
let mockVolumeDelta = vi.fn(async (_steps: number) => undefined);
let mockVolumeToggle = vi.fn(async () => undefined);
let mockInputs: readonly InputCatalogueEntry[] = [
  { id: 'KEY_SOURCE', label: 'Source picker' },
  { id: 'KEY_HDMI1', label: 'HDMI 1' },
];
let mockSetInput = vi.fn(async (_id: string) => undefined);
let mockBrowserLaunch = vi.fn(async (_url: string) => undefined);
let mockBrowserPending = false;

function resetMocks() {
  mockMuted = false;
  mockVolumeDelta = vi.fn(async (_steps: number) => undefined);
  mockVolumeToggle = vi.fn(async () => undefined);
  mockInputs = [
    { id: 'KEY_SOURCE', label: 'Source picker' },
    { id: 'KEY_HDMI1', label: 'HDMI 1' },
  ];
  mockSetInput = vi.fn(async (_id: string) => undefined);
  mockBrowserLaunch = vi.fn(async (_url: string) => undefined);
  mockBrowserPending = false;
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

// The knob is centred inside a 200×200 element. Tests need a deterministic
// bounding rect so `atan2(dy, dx)` maths lines up with the pointer coords
// we feed in — happy-dom's default rect is all zeros.
const KNOB_RECT = { left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200, x: 0, y: 0, toJSON: () => ({}) };
function mockKnobRect(knob: HTMLElement) {
  vi.spyOn(knob, 'getBoundingClientRect').mockReturnValue(KNOB_RECT as unknown as DOMRect);
}

function pointAt(deg: number): { clientX: number; clientY: number } {
  // Screen coords: y grows downward. atan2(dy, dx) with dy > 0 = below centre,
  // and Math conventions have +angle = CCW in math axes but CW on screen (y-down).
  // We want θ = 0 rad → right (3 o'clock), θ = -π/2 → up (12 o'clock).
  // Convert "clockwise degrees from 12 o'clock" → screen angle θ = -π/2 + deg*π/180.
  const theta = -Math.PI / 2 + (deg * Math.PI) / 180;
  const r = 80;
  return {
    clientX: 100 + r * Math.cos(theta),
    clientY: 100 + r * Math.sin(theta),
  };
}

function getKnob(container: HTMLElement): HTMLElement {
  const knob = container.querySelector<HTMLElement>('[role="slider"]');
  if (!knob) throw new Error('knob (role="slider") not found');
  mockKnobRect(knob);
  return knob;
}

describe('RemoteScreen', () => {
  it('renders every command control as disabled when the session is Connecting', () => {
    mockState = 'Connecting';
    resetMocks();
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
    resetMocks();
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

  it('renders the volume knob as a role="slider" when Connected', () => {
    mockState = 'Connected';
    resetMocks();
    const { container } = render(<RemoteScreen device={device()} onBack={vi.fn()} />);
    const knob = container.querySelector<HTMLElement>('[role="slider"]');
    expect(knob, 'volume knob not found').not.toBeNull();
    expect(knob?.getAttribute('aria-disabled')).toBe('false');
    expect(knob?.tabIndex).toBe(0);
  });

  it('rotating the knob 15° clockwise while Connected fires one sendDelta(+1)', () => {
    mockState = 'Connected';
    resetMocks();
    const { container } = render(<RemoteScreen device={device()} onBack={vi.fn()} />);
    const knob = getKnob(container);
    const start = pointAt(0);
    const after15 = pointAt(15);
    fireEvent.pointerDown(knob, { pointerId: 1, ...start });
    fireEvent.pointerMove(knob, { pointerId: 1, ...after15 });
    fireEvent.pointerUp(knob, { pointerId: 1, ...after15 });
    expect(mockVolumeDelta).toHaveBeenCalledTimes(1);
    expect(mockVolumeDelta).toHaveBeenCalledWith(1);
  });

  it('rotating the knob 15° counter-clockwise while Connected fires one sendDelta(-1)', () => {
    mockState = 'Connected';
    resetMocks();
    const { container } = render(<RemoteScreen device={device()} onBack={vi.fn()} />);
    const knob = getKnob(container);
    const start = pointAt(0);
    const afterMinus15 = pointAt(-15);
    fireEvent.pointerDown(knob, { pointerId: 1, ...start });
    fireEvent.pointerMove(knob, { pointerId: 1, ...afterMinus15 });
    fireEvent.pointerUp(knob, { pointerId: 1, ...afterMinus15 });
    expect(mockVolumeDelta).toHaveBeenCalledTimes(1);
    expect(mockVolumeDelta).toHaveBeenCalledWith(-1);
  });

  it('rotating 45° clockwise in one gesture fires three sendDelta(+1) calls', () => {
    mockState = 'Connected';
    resetMocks();
    const { container } = render(<RemoteScreen device={device()} onBack={vi.fn()} />);
    const knob = getKnob(container);
    fireEvent.pointerDown(knob, { pointerId: 1, ...pointAt(0) });
    fireEvent.pointerMove(knob, { pointerId: 1, ...pointAt(15.5) });
    fireEvent.pointerMove(knob, { pointerId: 1, ...pointAt(30.5) });
    fireEvent.pointerMove(knob, { pointerId: 1, ...pointAt(45.5) });
    fireEvent.pointerUp(knob, { pointerId: 1, ...pointAt(45.5) });
    expect(mockVolumeDelta).toHaveBeenCalledTimes(3);
    expect(mockVolumeDelta.mock.calls.map((c) => c[0])).toEqual([1, 1, 1]);
  });

  it('sub-detent rotation (10°) fires nothing', () => {
    mockState = 'Connected';
    resetMocks();
    const { container } = render(<RemoteScreen device={device()} onBack={vi.fn()} />);
    const knob = getKnob(container);
    fireEvent.pointerDown(knob, { pointerId: 1, ...pointAt(0) });
    fireEvent.pointerMove(knob, { pointerId: 1, ...pointAt(10) });
    fireEvent.pointerUp(knob, { pointerId: 1, ...pointAt(10) });
    expect(mockVolumeDelta).not.toHaveBeenCalled();
  });

  it('ArrowUp on a focused knob fires one sendDelta(+1)', () => {
    mockState = 'Connected';
    resetMocks();
    const { container } = render(<RemoteScreen device={device()} onBack={vi.fn()} />);
    const knob = getKnob(container);
    knob.focus();
    fireEvent.keyDown(knob, { key: 'ArrowUp' });
    expect(mockVolumeDelta).toHaveBeenCalledTimes(1);
    expect(mockVolumeDelta).toHaveBeenCalledWith(1);
  });

  it('ArrowDown on a focused knob fires one sendDelta(-1)', () => {
    mockState = 'Connected';
    resetMocks();
    const { container } = render(<RemoteScreen device={device()} onBack={vi.fn()} />);
    const knob = getKnob(container);
    knob.focus();
    fireEvent.keyDown(knob, { key: 'ArrowDown' });
    expect(mockVolumeDelta).toHaveBeenCalledTimes(1);
    expect(mockVolumeDelta).toHaveBeenCalledWith(-1);
  });

  it('PageUp on a focused knob fires three sendDelta(+1) calls in order', () => {
    mockState = 'Connected';
    resetMocks();
    const { container } = render(<RemoteScreen device={device()} onBack={vi.fn()} />);
    const knob = getKnob(container);
    knob.focus();
    fireEvent.keyDown(knob, { key: 'PageUp' });
    expect(mockVolumeDelta.mock.calls.map((c) => c[0])).toEqual([1, 1, 1]);
  });

  it('rotating the knob while Connecting fires no sendDelta', () => {
    mockState = 'Connecting';
    resetMocks();
    const { container } = render(<RemoteScreen device={device()} onBack={vi.fn()} />);
    const knob = container.querySelector<HTMLElement>('[role="slider"]');
    expect(knob, 'knob not found').not.toBeNull();
    expect(knob?.getAttribute('aria-disabled')).toBe('true');
    // The wrapper's opacity/pointer-events would already block pointer input in
    // the browser; also assert the component itself refuses to emit.
    mockKnobRect(knob!);
    fireEvent.pointerDown(knob!, { pointerId: 1, ...pointAt(0) });
    fireEvent.pointerMove(knob!, { pointerId: 1, ...pointAt(45) });
    fireEvent.pointerUp(knob!, { pointerId: 1, ...pointAt(45) });
    fireEvent.keyDown(knob!, { key: 'ArrowUp' });
    expect(mockVolumeDelta).not.toHaveBeenCalled();
  });

  it('renders volume_off with active prop when muted: true', () => {
    mockState = 'Connected';
    mockMuted = true;
    mockVolumeDelta = vi.fn(async (_steps: number) => undefined);
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

  it('clicking mute while Connected calls toggleMute', () => {
    mockState = 'Connected';
    resetMocks();
    const { container } = render(<RemoteScreen device={device()} onBack={vi.fn()} />);
    const mute = container.querySelector<HTMLButtonElement>('button[aria-label="Mute"]');
    fireEvent.click(mute!);
    expect(mockVolumeToggle).toHaveBeenCalledTimes(1);
  });

  it('does not render the AppShortcut labels (Live TV / Movies / Games / Apps)', () => {
    mockState = 'Connected';
    resetMocks();
    const { container } = render(<RemoteScreen device={device()} onBack={vi.fn()} />);
    const text = container.textContent ?? '';
    expect(text).not.toContain('Live TV');
    expect(text).not.toContain('Movies');
    expect(text).not.toContain('Games');
    // "Apps" also served as an AppShortcut label; the removed row shouldn't leave
    // the standalone word behind (other UI copy uses "app" lowercase / different phrasing).
    expect(text).not.toContain('Apps');
  });

  it('renders the URL input and "Open" button in place of the AppShortcut row', () => {
    mockState = 'Connected';
    resetMocks();
    const { container } = render(<RemoteScreen device={device()} onBack={vi.fn()} />);
    const urlInput = container.querySelector<HTMLInputElement>('input[type="url"]');
    expect(urlInput, 'URL input not found').not.toBeNull();
    const openButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button'),
    ).find((btn) => btn.textContent?.trim() === 'Open');
    expect(openButton, '"Open" button not found').not.toBeUndefined();
  });

  it('"Open" button is disabled while the URL is empty', () => {
    mockState = 'Connected';
    resetMocks();
    const { container } = render(<RemoteScreen device={device()} onBack={vi.fn()} />);
    const openButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button'),
    ).find((btn) => btn.textContent?.trim() === 'Open');
    expect(openButton?.disabled).toBe(true);
  });

  it('"Open" button is disabled while state is Connecting even if the URL is present', () => {
    mockState = 'Connecting';
    resetMocks();
    const { container } = render(<RemoteScreen device={device()} onBack={vi.fn()} />);
    const urlInput = container.querySelector<HTMLInputElement>('input[type="url"]');
    fireEvent.change(urlInput!, { target: { value: 'https://www.google.com' } });
    const openButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button'),
    ).find((btn) => btn.textContent?.trim() === 'Open');
    expect(openButton?.disabled).toBe(true);
  });

  it('"Open" button is disabled while a launch is in flight (isPending=true)', () => {
    mockState = 'Connected';
    resetMocks();
    mockBrowserPending = true;
    const { container } = render(<RemoteScreen device={device()} onBack={vi.fn()} />);
    const urlInput = container.querySelector<HTMLInputElement>('input[type="url"]');
    fireEvent.change(urlInput!, { target: { value: 'https://www.google.com' } });
    const openButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button'),
    ).find((btn) => btn.textContent?.trim() === 'Open');
    expect(openButton?.disabled).toBe(true);
  });

  it('tapping "Open" while Connected with a URL calls launch(url) exactly once and clears the input on resolve', async () => {
    mockState = 'Connected';
    resetMocks();
    const { container } = render(<RemoteScreen device={device()} onBack={vi.fn()} />);
    const urlInput = container.querySelector<HTMLInputElement>('input[type="url"]');
    fireEvent.change(urlInput!, { target: { value: 'https://www.google.com' } });
    const openButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button'),
    ).find((btn) => btn.textContent?.trim() === 'Open');
    expect(openButton?.disabled).toBe(false);
    fireEvent.click(openButton!);
    expect(mockBrowserLaunch).toHaveBeenCalledTimes(1);
    expect(mockBrowserLaunch).toHaveBeenCalledWith('https://www.google.com');
    // launch() resolves asynchronously; the input clears in a .then() handler,
    // so wait for the state update to flush through React's scheduler.
    await waitFor(() => expect(urlInput?.value).toBe(''));
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
