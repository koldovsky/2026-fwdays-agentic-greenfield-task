// jsdom test setup: jest-dom matchers + auto-cleanup between tests.
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

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
