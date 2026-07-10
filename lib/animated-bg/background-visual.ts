import type { BackgroundCondition } from "./weather-condition";

export type BackgroundEffect = "none" | "clouds" | "rain" | "snow" | "stars";

export type BackgroundVisual = {
  gradient: string;
  effect: BackgroundEffect;
  animate: boolean;
  layerClassName: string;
};

export const BACKGROUND_LAYER_CLASSNAME =
  "pointer-events-none fixed inset-0 -z-10";

type ResolveBackgroundVisualInput = {
  condition: BackgroundCondition;
  isDaytime: boolean;
  reducedMotion: boolean;
};

export function resolveBackgroundVisual(
  input: ResolveBackgroundVisualInput,
): BackgroundVisual {
  const { condition, isDaytime, reducedMotion } = input;
  const animate = !reducedMotion;
  const gradient = pickGradient(condition, isDaytime);
  const effect = reducedMotion ? "none" : pickEffect(condition, isDaytime);

  return {
    gradient,
    effect,
    animate,
    layerClassName: BACKGROUND_LAYER_CLASSNAME,
  };
}

export function defaultBackgroundVisual(reducedMotion = false): BackgroundVisual {
  return resolveBackgroundVisual({
    condition: "clear",
    isDaytime: true,
    reducedMotion,
  });
}

function pickGradient(condition: BackgroundCondition, isDaytime: boolean): string {
  if (condition === "snow") {
    return isDaytime
      ? "radial-gradient(circle at top left, rgba(148, 163, 184, 0.35), transparent 32rem), linear-gradient(135deg, #e2e8f0 0%, #eef2ff 52%, #f8fafc 100%)"
      : "radial-gradient(circle at top left, rgba(99, 102, 139, 0.35), transparent 30rem), linear-gradient(135deg, #111827 0%, #1e293b 55%, #0f172a 100%)";
  }

  if (condition === "rain") {
    return isDaytime
      ? "radial-gradient(circle at top left, rgba(59, 111, 217, 0.18), transparent 32rem), linear-gradient(135deg, #dbeafe 0%, #cbd5e1 52%, #e2e8f0 100%)"
      : "radial-gradient(circle at top left, rgba(59, 130, 246, 0.12), transparent 30rem), linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #111827 100%)";
  }

  if (condition === "overcast") {
    return isDaytime
      ? "radial-gradient(circle at top left, rgba(148, 163, 184, 0.28), transparent 32rem), linear-gradient(135deg, #e5e7eb 0%, #eef2ff 55%, #f8fafc 100%)"
      : "radial-gradient(circle at top left, rgba(100, 116, 139, 0.25), transparent 30rem), linear-gradient(135deg, #111827 0%, #1f2937 55%, #0f1419 100%)";
  }

  return isDaytime
    ? "radial-gradient(circle at top left, rgba(59, 111, 217, 0.22), transparent 32rem), linear-gradient(135deg, #f4f7fb 0%, #e9f1fb 48%, #f8fafc 100%)"
    : "radial-gradient(circle at top left, rgba(107, 159, 255, 0.18), transparent 30rem), linear-gradient(135deg, #0f1419 0%, #172033 55%, #10151c 100%)";
}

function pickEffect(condition: BackgroundCondition, isDaytime: boolean): BackgroundEffect {
  if (condition === "rain") {
    return "rain";
  }

  if (condition === "snow") {
    return "snow";
  }

  if (condition === "overcast") {
    return "clouds";
  }

  return isDaytime ? "clouds" : "stars";
}
