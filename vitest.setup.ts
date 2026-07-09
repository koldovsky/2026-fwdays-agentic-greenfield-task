// jsdom test setup: jest-dom matchers + auto-cleanup between tests.
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom's Blob has no `.stream()`, so undici's `Response` body-consume throws
// `TypeError: object.stream is not a function` when a test builds
// `new Response(new Blob([...]))` (e.g. ExportDataButton GDPR-download tests).
// Polyfill a minimal ReadableStream-backed stream() from the blob's bytes.
if (typeof Blob !== "undefined" && typeof Blob.prototype.stream !== "function") {
  Blob.prototype.stream = function stream(this: Blob) {
    return new ReadableStream({
      start: async (controller) => {
        const buffer = await this.arrayBuffer();
        controller.enqueue(new Uint8Array(buffer));
        controller.close();
      },
    });
    // Cast: our ArrayBuffer-backed stream is structurally a Blob stream; TS's
    // lib types pin the exact ArrayBuffer variance, which we don't need in tests.
  } as typeof Blob.prototype.stream;
}

// Global next/navigation stub so client components that call useRouter (e.g. the
// top-bar LanguageSwitch, add-language-toggle) render in jsdom without a mounted
// App Router. redirect/notFound throw like the real ones so guard tests still
// work; a test file may still vi.mock("next/navigation", ...) to override this.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

afterEach(() => {
  cleanup();
});
