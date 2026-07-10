import { describe, expect, it } from "vitest";
import {
  BACKGROUND_LAYER_CLASSNAME,
  resolveBackgroundVisual,
} from "./background-visual";

// @trace FR-ANIM-03
describe("resolveBackgroundVisual reduced motion", () => {
  it("disables animation and particles when reduced motion is requested", () => {
    const visual = resolveBackgroundVisual({
      condition: "rain",
      isDaytime: true,
      reducedMotion: true,
    });

    expect(visual.animate).toBe(false);
    expect(visual.effect).toBe("none");
    expect(visual.gradient).toContain("linear-gradient");
  });

  it("keeps rain particles when motion is allowed", () => {
    const visual = resolveBackgroundVisual({
      condition: "rain",
      isDaytime: false,
      reducedMotion: false,
    });

    expect(visual.animate).toBe(true);
    expect(visual.effect).toBe("rain");
  });
});

// @trace FR-ANIM-04
describe("background layer interaction policy", () => {
  it("marks the decorative layer as non-interactive", () => {
    const visual = resolveBackgroundVisual({
      condition: "clear",
      isDaytime: true,
      reducedMotion: false,
    });

    expect(visual.layerClassName).toBe(BACKGROUND_LAYER_CLASSNAME);
    expect(visual.layerClassName).toContain("pointer-events-none");
  });
});
