// RED (Phase 4b) — written from the spec BEFORE the implementation exists.
// The import of `@/components/icons` will FAIL (module not yet created), which
// is the right reason for red: the botanical line-icon set is specified by
// FR-DS-04 / design.md D5 but has no code yet. Asserts every glyph renders an
// <svg> drawn with stroke-width 1.8, round caps/joins, and no fill, is
// decorative (aria-hidden) by default, and exposes an accessible name
// (role="img" + <title>) when given a `title` prop.
//
// @trace FR-DS-04
// @trace NFR-A11Y-04
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ComponentType } from "react";

import {
  WaterDropIcon,
  LeafIcon,
  SproutIcon,
  SunIcon,
  PotIcon,
  BellIcon,
} from "@/components/icons";

afterEach(cleanup);

interface IconProps {
  title?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

// The six required glyphs (FR-DS-04). The water-drop is BOTH the brand glyph
// and the water action — the same component is reused in both, so it appears
// once here.
const ICONS: Array<[string, ComponentType<IconProps>]> = [
  ["WaterDropIcon", WaterDropIcon],
  ["LeafIcon", LeafIcon],
  ["SproutIcon", SproutIcon],
  ["SunIcon", SunIcon],
  ["PotIcon", PotIcon],
  ["BellIcon", BellIcon],
];

function renderIcon(Icon: ComponentType<IconProps>, props: IconProps = {}) {
  const { container } = render(<Icon {...props} />);
  const svg = container.querySelector("svg");
  return svg;
}

describe("botanical line-icon set (FR-DS-04)", () => {
  it.each(ICONS)("%s renders an <svg>", (_name, Icon) => {
    expect(renderIcon(Icon)).not.toBeNull();
  });

  // Scenario: Icon stroke style — stroke-width 1.8, round caps and joins, no
  // fill (FR-DS-04). The attributes are asserted on the <svg> root (the icons
  // set them there and inherit via currentColor / presentation attrs).
  it.each(ICONS)("%s is stroked with width 1.8, round caps/joins, no fill", (
    _name,
    Icon,
  ) => {
    const svg = renderIcon(Icon)!;
    expect(svg).not.toBeNull();
    // stroke-width 1.8 — accept the numeric attribute form "1.8".
    expect(svg.getAttribute("stroke-width")).toBe("1.8");
    expect(svg.getAttribute("stroke-linecap")).toBe("round");
    expect(svg.getAttribute("stroke-linejoin")).toBe("round");
    // No fill: single-color stroke via currentColor.
    expect(svg.getAttribute("fill")).toBe("none");
  });

  // Scenario: Decorative vs labelled icon accessibility (FR-DS-04, NFR-A11Y-04).
  it.each(ICONS)("%s is decorative (aria-hidden) by default", (_name, Icon) => {
    const svg = renderIcon(Icon)!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    // A decorative icon must NOT advertise an image role.
    expect(svg.getAttribute("role")).not.toBe("img");
  });

  it.each(ICONS)(
    "%s exposes an accessible name via role=img + <title> when titled",
    (name, Icon) => {
      const svg = renderIcon(Icon, { title: `${name} label` })!;
      expect(svg.getAttribute("role")).toBe("img");
      // A titled icon is NOT hidden from assistive tech.
      expect(svg.getAttribute("aria-hidden")).not.toBe("true");
      const title = svg.querySelector("title");
      expect(title?.textContent).toBe(`${name} label`);
    },
  );
});
