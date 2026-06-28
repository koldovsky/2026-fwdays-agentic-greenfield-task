import { act, renderHook } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { PinnedCitiesProvider } from "@/app/components/PinnedCities/PinnedCitiesContext";
import { usePinnedCities } from "./usePinnedCities";

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(PinnedCitiesProvider, null, children);

const kyiv = { lat: 50.45, lon: 30.52, name: "Kyiv" };
const lviv = { lat: 49.84, lon: 24.03, name: "Lviv" };
const odesa = { lat: 46.48, lon: 30.73, name: "Odesa" };
const kharkiv = { lat: 49.99, lon: 36.23, name: "Kharkiv" };
const dnipro = { lat: 48.46, lon: 35.04, name: "Dnipro" };
const zaporizhzhia = { lat: 47.84, lon: 35.14, name: "Zaporizhzhia" };

describe("usePinnedCities", () => {
  it("starts with an empty pins list", () => {
    const { result } = renderHook(() => usePinnedCities(), { wrapper });
    expect(result.current.pins).toHaveLength(0);
  });

  it("pins a city", () => {
    const { result } = renderHook(() => usePinnedCities(), { wrapper });
    act(() => {
      result.current.pin(kyiv);
    });
    expect(result.current.pins).toHaveLength(1);
    expect(result.current.pins[0].name).toBe("Kyiv");
  });

  it("unpins a city", () => {
    const { result } = renderHook(() => usePinnedCities(), { wrapper });
    act(() => {
      result.current.pin(kyiv);
    });
    act(() => {
      result.current.unpin(kyiv);
    });
    expect(result.current.pins).toHaveLength(0);
  });

  it("enforces max 5 cities — 6th pin evicts the oldest (FIFO queue)", () => {
    const { result } = renderHook(() => usePinnedCities(), { wrapper });
    act(() => {
      result.current.pin(kyiv);
      result.current.pin(lviv);
      result.current.pin(odesa);
      result.current.pin(kharkiv);
      result.current.pin(dnipro);
      result.current.pin(zaporizhzhia); // 6th — evicts Kyiv (oldest)
    });
    expect(result.current.pins).toHaveLength(5);
    expect(result.current.pins.map((p) => p.name)).not.toContain("Kyiv");
    expect(result.current.pins.map((p) => p.name)).toContain("Zaporizhzhia");
  });

  it("duplicate pin is a no-op", () => {
    const { result } = renderHook(() => usePinnedCities(), { wrapper });
    act(() => {
      result.current.pin(kyiv);
      result.current.pin(kyiv);
    });
    expect(result.current.pins).toHaveLength(1);
  });

  it("unpinning a city not in the list is a no-op", () => {
    const { result } = renderHook(() => usePinnedCities(), { wrapper });
    act(() => {
      result.current.pin(kyiv);
    });
    act(() => {
      result.current.unpin(lviv);
    }); // lviv not pinned
    expect(result.current.pins).toHaveLength(1);
  });
});
