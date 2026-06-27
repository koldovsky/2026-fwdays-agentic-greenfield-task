/**
 * Local reminder sounds via the Web Audio API — no asset files, no network.
 * Played only when `soundEnabled` is true (the caller gates this). Any failure
 * (autoplay policy, unsupported) is swallowed; the visual nudge is the real
 * signal (FR-NOTIFY-05).
 */

import type { SoundChoice } from "@/lib/types";

type AudioContextCtor = typeof AudioContext;

const MELODY_NOTES = [392, 440, 523.25, 659.25, 587.33, 523.25, 440, 392] as const;

function getAudioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext;
}

function soundDuration(sound: SoundChoice): number {
  if (sound === "melody-10") return 10;
  if (sound === "melody-30") return 30;
  return 0.7;
}

function scheduleFrequency(osc: OscillatorNode, sound: SoundChoice, start: number): void {
  if (sound === "ping") {
    osc.frequency.setValueAtTime(528, start);
    return;
  }

  const step = sound === "melody-10" ? 0.5 : 0.75;
  const duration = soundDuration(sound);
  for (let elapsed = 0; elapsed < duration; elapsed += step) {
    const note = MELODY_NOTES[Math.floor(elapsed / step) % MELODY_NOTES.length];
    osc.frequency.setValueAtTime(note, start + elapsed);
  }
}

export function playReminderSound(sound: SoundChoice): void {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return;
  try {
    const ctx = new Ctor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const duration = soundDuration(sound);
    const t = ctx.currentTime;
    osc.type = sound === "ping" ? "sine" : "triangle";
    scheduleFrequency(osc, sound, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(sound === "ping" ? 0.15 : 0.08, t + 0.05);
    gain.gain.setValueAtTime(sound === "ping" ? 0.15 : 0.08, t + duration - 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
    osc.onended = () => void ctx.close();
  } catch {
    // Autoplay blocked or Web Audio unavailable — stay silent, never throw.
  }
}
