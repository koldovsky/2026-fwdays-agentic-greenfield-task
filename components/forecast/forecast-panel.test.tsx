import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ForecastViewModel } from "@/lib/forecast/forecast";

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockDynamicChart({ points }: { points: unknown[] }) {
      return <div data-testid="temperature-chart">Chart points: {points.length}</div>;
    },
}));

import { ForecastPanelView } from "./forecast-panel";

const forecast: ForecastViewModel = {
  days: Array.from({ length: 7 }, (_, index) => ({
    date: `2026-06-${String(27 + index).padStart(2, "0")}`,
    weekday: ["сб", "нд", "пн", "вт", "ср", "чт", "пт"][index],
    weatherCode: 0,
    weatherIcon: "☀️",
    temperatureMaxC: 24,
    temperatureMinC: 14,
    precipitationProbability: 10,
    windSpeedMs: 3,
    sunrise: "2026-06-27T05:02",
    sunset: "2026-06-27T21:11",
    comfort: {
      value: 82,
      rationale: "сухо і спокійно",
    },
    comfortTier: "green",
  })),
  hourly: Array.from({ length: 48 }, (_, index) => ({
    time: `2026-06-27T${String(index % 24).padStart(2, "0")}:00`,
    label: `${String(index % 24).padStart(2, "0")}:00`,
    temperatureC: 18 + (index % 6),
  })),
  todaySun: {
    sunrise: "05:02",
    sunset: "21:11",
  },
  weekendHighlight: {
    value: 78,
    saturday: {
      value: 82,
      rationale: "сухо і спокійно",
    },
    sunday: {
      value: 74,
      rationale: "трохи хмарно",
    },
  },
};

describe("ForecastPanelView", () => {
  // @trace FR-FORECAST-02, FR-FORECAST-03, FR-FORECAST-04, FR-COMFORT-04, FR-COMFORT-05
  it("renders cards, chart section, sun note, comfort text, and weekend highlight", () => {
    const html = renderToStaticMarkup(
      <ForecastPanelView forecast={forecast} hasError={false} isLoading={false} />,
    );

    expect(html.match(/<article/g)).toHaveLength(7);
    expect(html).toContain("Температура на 48 годин");
    expect(html).toContain("Chart points: 48");
    expect(html).toContain("Схід: 05:02");
    expect(html).toContain("Захід: 21:11");
    expect(html).toContain("Комфорт: 82/100");
    expect(html).toContain("Вихідні");
    expect(html).toContain("78/100");
  });
});
