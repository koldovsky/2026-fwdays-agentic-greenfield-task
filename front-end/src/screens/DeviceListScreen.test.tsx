import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeviceListScreen } from './DeviceListScreen.tsx';
import type { Device } from '../data/types.ts';

function samsung(overrides: Partial<Device> = {}): Device {
  return {
    udn: 'x',
    name: 'Living Room',
    model: 'UN65KS8500',
    ip: '192.168.1.42',
    port: 9197,
    status: 'online',
    lastSeen: 0,
    ...overrides,
  };
}

describe('DeviceListScreen', () => {
  it('renders the empty state message when the list is empty', () => {
    const { container } = render(
      <DeviceListScreen devices={[]} onOpenDevice={vi.fn()} />,
    );
    expect(container.textContent ?? '').toContain(
      'No TVs found. Make sure your TV is on the same Wi-Fi network.',
    );
    // The `tv_off` Material Symbols glyph is rendered as the icon.
    expect(container.textContent ?? '').toContain('tv_off');
  });

  it('renders one DeviceCard per device, showing name + ip', () => {
    const { container } = render(
      <DeviceListScreen
        devices={[
          samsung({ udn: 'a', name: 'Living Room', ip: '192.168.1.42' }),
          samsung({
            udn: 'b',
            name: 'Bedroom',
            ip: '192.168.1.58',
            status: 'offline',
          }),
        ]}
        onOpenDevice={vi.fn()}
      />,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('Living Room');
    expect(text).toContain('192.168.1.42');
    expect(text).toContain('Bedroom');
    expect(text).toContain('192.168.1.58');
    // Two device cards + the disabled "Add a TV" primary CTA.
    expect(text).toContain('Add a TV');
  });

  it('handles model: null without leaking "null" or "undefined" into the DOM', () => {
    const { container } = render(
      <DeviceListScreen
        devices={[samsung({ model: null })]}
        onOpenDevice={vi.fn()}
      />,
    );
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/\bnull\b/);
    expect(text).not.toMatch(/\bundefined\b/);
  });
});
