import { describe, expect, it } from "vitest";
import {
  amountToCursive,
  dateToCursive,
  dateToNumeric,
} from "./locale-helpers";

describe("amountToCursive", () => {
  it("TC-22: formats 8750 as Ukrainian amount in words", () => {
    expect(amountToCursive(8750)).toBe(
      "Вісім тисяч сімсот п'ятдесят гривень 00 копійок",
    );
  });

  it("formats zero", () => {
    expect(amountToCursive(0)).toBe("Нуль гривень 00 копійок");
  });

  it("uses feminine gender for 1 гривня", () => {
    expect(amountToCursive(1)).toBe("Одна гривня 00 копійок");
  });

  it("uses feminine gender for 2 гривні", () => {
    expect(amountToCursive(2)).toBe("Дві гривні 00 копійок");
  });

  it("maps fractional part to копійки", () => {
    expect(amountToCursive(8750.5)).toBe(
      "Вісім тисяч сімсот п'ятдесят гривень 50 копійок",
    );
  });
});

describe("date helpers", () => {
  it("TC-23: formats 15.05.2021 numerically", () => {
    expect(dateToNumeric("15.05.2021")).toBe("15.05.2021");
  });

  it("TC-23: formats 15.05.2021 in Ukrainian cursive", () => {
    expect(dateToCursive("15.05.2021")).toBe("15 травня 2021 р.");
  });

  it("uses Ukrainian genitive month names", () => {
    expect(dateToCursive("01.01.2020")).toBe("1 січня 2020 р.");
    expect(dateToCursive("03.12.2022")).toBe("3 грудня 2022 р.");
  });
});
