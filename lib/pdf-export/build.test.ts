import { afterAll, describe, expect, it } from "vitest";
import type { DocumentSession } from "../document-session/types";
import {
  buildPdf,
  closeBrowser,
  PdfTypeNotAllowedError,
  renderHtmlToPdf,
} from "./index";

function fixtureSession(
  overrides: Partial<DocumentSession> = {},
): DocumentSession {
  return {
    guid: "11111111-1111-4111-8111-111111111111",
    "doc-type": "invoice_act",
    "current-step": 7,
    completed: true,
    date: "2021-05-15",
    "invoice-number": "42",
    "act-number": "7",
    client: {
      "full-name": "Клієнт Тест",
      inn: "1111111111",
      phone: "+380111111111",
      acc: "UA111",
      bank: "Банк Клієнта",
      "mfo-bank": "300001",
      addr: "Київ, вул. Клієнтська 1",
    },
    "done-by": {
      "full-name": "Виконавець Тест",
      inn: "2222222222",
      phone: "+380222222222",
      acc: "UA222",
      bank: "Банк Виконавця",
      "mfo-bank": "300002",
      addr: "Львів, вул. Виконавча 2",
    },
    services: [
      {
        "sign-name": "dev",
        "service-name": "Розробка",
        amount: 2,
        price: 1000,
      },
    ],
    "updated-at": "2026-07-10T00:00:00.000Z",
    ...overrides,
  };
}

function isPdfMagic(buf: Buffer): boolean {
  return buf.subarray(0, 5).toString("ascii") === "%PDF-";
}

afterAll(async () => {
  await closeBrowser();
});

describe("renderHtmlToPdf", () => {
  it("returns non-empty PDF bytes for simple HTML", async () => {
    const pdf = await renderHtmlToPdf(
      "<!DOCTYPE html><html><body><h1>Test</h1></body></html>",
    );
    expect(pdf.length).toBeGreaterThan(100);
    expect(isPdfMagic(pdf)).toBe(true);
  }, 60_000);
});

describe("buildPdf", () => {
  it("builds invoice PDF from filled template", async () => {
    const pdf = await buildPdf(fixtureSession(), "invoice");
    expect(pdf.length).toBeGreaterThan(100);
    expect(isPdfMagic(pdf)).toBe(true);
  }, 60_000);

  it("rejects act PDF for invoice-only session", async () => {
    await expect(
      buildPdf(fixtureSession({ "doc-type": "invoice" }), "act"),
    ).rejects.toBeInstanceOf(PdfTypeNotAllowedError);
  });

  it("rejects invoice PDF for act-only session", async () => {
    await expect(
      buildPdf(fixtureSession({ "doc-type": "act" }), "invoice"),
    ).rejects.toBeInstanceOf(PdfTypeNotAllowedError);
  });
});
