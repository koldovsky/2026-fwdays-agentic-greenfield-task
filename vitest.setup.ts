import "@testing-library/jest-dom/vitest";

// Node 26 defines a native, experimental `localStorage` getter on the global
// that returns undefined unless `--localstorage-file` is passed. Because vitest
// exposes the jsdom window AS the global, that Node getter shadows jsdom's own
// working Storage. Re-point the global storage accessors at the jsdom window's
// real Storage instances so tests get a functioning, prototype-backed store.
const jsdomWindow = (globalThis as { jsdom?: { window: Window & typeof globalThis } }).jsdom?.window;

if (jsdomWindow?.localStorage) {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get: () => jsdomWindow.localStorage,
  });
}

if (jsdomWindow?.sessionStorage) {
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    get: () => jsdomWindow.sessionStorage,
  });
}
