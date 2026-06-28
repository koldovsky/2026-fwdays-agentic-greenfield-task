// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import { playReminderSound } from "./sound";

class FakeAudioParam {
  events: { value: number; time: number }[] = [];
  value = 0;

  setValueAtTime(value: number, time: number): AudioParam {
    this.value = value;
    this.events.push({ value, time });
    return this as unknown as AudioParam;
  }

  exponentialRampToValueAtTime(value: number, time: number): AudioParam {
    this.value = value;
    this.events.push({ value, time });
    return this as unknown as AudioParam;
  }
}

class FakeOscillator {
  frequency = new FakeAudioParam();
  onended: (() => void) | null = null;
  stopAt: number | null = null;
  type: OscillatorType = "sine";

  connect(): void {}
  start(): void {}
  stop(time: number): void {
    this.stopAt = time;
  }
}

class FakeGain {
  gain = new FakeAudioParam();

  connect(): void {}
}

class FakeAudioContext {
  static last: FakeAudioContext | null = null;

  currentTime = 2;
  destination = {};
  gain = new FakeGain();
  oscillator = new FakeOscillator();

  constructor() {
    FakeAudioContext.last = this;
  }

  createOscillator(): OscillatorNode {
    return this.oscillator as unknown as OscillatorNode;
  }

  createGain(): GainNode {
    return this.gain as unknown as GainNode;
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}

describe("playReminderSound", () => {
  beforeEach(() => {
    FakeAudioContext.last = null;
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: FakeAudioContext as unknown as typeof AudioContext,
    });
  });

  it("keeps the existing ping short", () => {
    playReminderSound("ping");

    const ctx = FakeAudioContext.last;
    expect(ctx).not.toBeNull();
    expect(ctx?.oscillator.type).toBe("sine");
    expect(ctx?.oscillator.frequency.events[0]).toEqual({ value: 528, time: 2 });
    expect(ctx?.oscillator.stopAt).toBeCloseTo(2.7);
  });

  it("schedules the 10 second melody", () => {
    playReminderSound("melody-10");

    const ctx = FakeAudioContext.last;
    expect(ctx?.oscillator.type).toBe("triangle");
    expect(ctx?.oscillator.frequency.events.length).toBeGreaterThan(10);
    expect(ctx?.oscillator.stopAt).toBe(12);
  });

  it("schedules the 30 second melody", () => {
    playReminderSound("melody-30");

    const ctx = FakeAudioContext.last;
    expect(ctx?.oscillator.type).toBe("triangle");
    expect(ctx?.oscillator.frequency.events.length).toBeGreaterThan(30);
    expect(ctx?.oscillator.stopAt).toBe(32);
  });
});
