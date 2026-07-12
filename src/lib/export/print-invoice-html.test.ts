import { afterEach, describe, expect, it, vi } from "vitest";

import { EmptyInvoiceHtmlError } from "@/lib/export/download-invoice-html";
import {
  printInvoiceFrame,
  printInvoiceHtml,
} from "@/lib/export/print-invoice-html";

describe("printInvoiceFrame", () => {
  it("calls print on the preview iframe content window", () => {
    const print = vi.fn();
    const focus = vi.fn();
    const iframe = {
      contentWindow: { focus, print },
    } as unknown as HTMLIFrameElement;

    printInvoiceFrame(iframe);

    expect(focus).toHaveBeenCalledTimes(1);
    expect(print).toHaveBeenCalledTimes(1);
  });
});

describe("printInvoiceHtml", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejects empty html", async () => {
    await expect(printInvoiceHtml("  ")).rejects.toBeInstanceOf(
      EmptyInvoiceHtmlError
    );
  });

  // Deliberately untraced. The `210mm x 297mm` here is the hidden iframe's
  // on-screen box (so browsers don't print a blank page), not the print page
  // size — that lives in the template's `@page { size: A4 }`. Change it to
  // Letter, or overflow the body horizontally, and this test still passes
  // (jsdom does no layout). FR-EXPORT-03's honest method is `recording` / `e2e`.
  // See docs/qa/trace-gaps.md
  it("loads html in a sized iframe and calls print on content window", async () => {
    const print = vi.fn();
    const focus = vi.fn();
    const remove = vi.fn();
    const appendChild = vi.fn();
    const afterPrintHandlers: Array<() => void> = [];
    let onloadHandler: (() => void) | null = null;

    const contentWindow = {
      focus,
      print,
      addEventListener: (event: string, handler: () => void) => {
        if (event === "afterprint") {
          afterPrintHandlers.push(handler);
        }
      },
    };

    const iframe = {
      style: {} as CSSStyleDeclaration,
      setAttribute: vi.fn(),
      remove,
      contentWindow,
      get onload() {
        return onloadHandler;
      },
      set onload(handler: (() => void) | null) {
        onloadHandler = handler;
      },
    };

    vi.stubGlobal("document", {
      createElement: vi.fn(() => iframe),
      body: {
        appendChild,
      },
    });

    vi.stubGlobal("window", {
      setTimeout: vi.fn(() => 99),
      clearTimeout: vi.fn(),
    });

    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      })
    );

    Object.defineProperty(iframe, "srcdoc", {
      set() {
        onloadHandler?.();
      },
    });

    const promise = printInvoiceHtml("<html><body>Invoice</body></html>");

    expect(iframe.style.width).toBe("210mm");
    expect(iframe.style.height).toBe("297mm");
    expect(print).toHaveBeenCalledTimes(1);
    expect(afterPrintHandlers).toHaveLength(1);
    afterPrintHandlers[0]!();

    await expect(promise).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalled();
  });
});
