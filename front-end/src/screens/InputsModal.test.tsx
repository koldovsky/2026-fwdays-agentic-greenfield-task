import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InputsModal } from './InputsModal.tsx';
import type { InputCatalogueEntry } from '../data/inputs.ts';

const SAMPLE_INPUTS: readonly InputCatalogueEntry[] = [
  { id: 'KEY_SOURCE', label: 'Source picker' },
  { id: 'KEY_HDMI1', label: 'HDMI 1' },
  { id: 'KEY_TV', label: 'TV tuner' },
];

describe('InputsModal', () => {
  it('renders one row per input catalogue entry with its label', () => {
    const { container } = render(
      <InputsModal
        open
        onClose={vi.fn()}
        state="Connected"
        inputs={SAMPLE_INPUTS}
        setInput={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    const text = container.textContent ?? '';
    for (const entry of SAMPLE_INPUTS) {
      expect(text).toContain(entry.label);
    }
  });

  it('tapping a row while Connected calls setInput with that row\'s id and calls onClose', async () => {
    const setInput = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const { container } = render(
      <InputsModal
        open
        onClose={onClose}
        state="Connected"
        inputs={SAMPLE_INPUTS}
        setInput={setInput}
      />,
    );
    // Find the row whose visible label matches "HDMI 1".
    const rows = Array.from(container.querySelectorAll<HTMLButtonElement>('button'));
    const hdmi1Row = rows.find((r) => (r.textContent ?? '').includes('HDMI 1'));
    expect(hdmi1Row, 'expected an HDMI 1 row').toBeTruthy();
    expect(hdmi1Row?.disabled).toBe(false);
    fireEvent.click(hdmi1Row!);
    expect(setInput).toHaveBeenCalledWith('KEY_HDMI1');
    // onClose runs from the .finally of the setInput promise.
    await Promise.resolve();
    await Promise.resolve();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('rows are disabled while state="Connecting" and clicks fire no setInput', () => {
    const setInput = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <InputsModal
        open
        onClose={vi.fn()}
        state="Connecting"
        inputs={SAMPLE_INPUTS}
        setInput={setInput}
      />,
    );
    const rows = Array.from(container.querySelectorAll<HTMLButtonElement>('button'));
    // The Modal's close button is one of the buttons — filter to the rows that
    // carry an input label.
    const hdmi1Row = rows.find((r) => (r.textContent ?? '').includes('HDMI 1'));
    expect(hdmi1Row?.disabled).toBe(true);
    if (hdmi1Row) fireEvent.click(hdmi1Row);
    expect(setInput).not.toHaveBeenCalled();
  });
});
