/**
 * visual-helper.js — Playwright `addInitScript()` content.
 *
 * Inject the mouse cursor, focus outline, and trail effects into every
 * page in the recording context. Runs before any page script so the
 * overlays are present from the first paint (the recording captures
 * them, not a flash of the raw DOM).
 *
 * The script is a self-contained IIFE — it has no module imports and
 * never touches the page's global state. It only appends its own
 * styled elements (`<style>` + cursor + trail dots) to the document.
 *
 * Wired in by `scripts/playwright.video.config.ts` via a Playwright
 * fixture (see `scripts/visual-helper-fixture.ts` for the extended
 * `test` that auto-registers the script in `beforeEach`).
 *
 * Quick 20260711-0910: refactor the `document-bdd-feature` skill
 * to record mouse trail + focus outline so the demo videos show the
 * user's intended interaction surface. The trail + focus outline
 * are pure page-side overlays — they appear in the webm recording
 * even though headless mode has no real OS cursor.
 *
 * Style choices:
 *   - Cursor: 18px cyan circle with a 2px solid border (turns red on
 *     mousedown for click feedback).
 *   - Trail: 10px cyan dot, fades over 500ms, removed after 650ms.
 *   - Focus outline: 3px orange outline + 4px halo. The orange
 *     contrasts with the cyan cursor so focus + cursor don't blend
 *     when they overlap.
 *
 * Reference: Playwright `BrowserContext.addInitScript()` is explicitly
 * meant for code that must run before page scripts and applies to
 * every page and child frame in the context.
 * https://playwright.dev/docs/api/class-browsercontext
 */
(() => {
  if (window.top !== window) return;

  const STYLE_ID = "pw-visual-helper-style";
  const CURSOR_ID = "pw-visual-cursor";
  const TRAIL_CLASS = "pw-cursor-trail";
  const FOCUS_CLASS = "pw-active-focus";

  let lastX = 0;
  let lastY = 0;
  let trailTimer;

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .${FOCUS_CLASS} {
        outline: 3px solid #ff9800 !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 4px rgba(255, 152, 0, 0.28) !important;
      }

      #${CURSOR_ID} {
        position: fixed;
        left: 0;
        top: 0;
        width: 18px;
        height: 18px;
        margin-left: -9px;
        margin-top: -9px;
        border: 2px solid #00c2ff;
        border-radius: 50%;
        background: rgba(0, 194, 255, 0.18);
        pointer-events: none;
        z-index: 2147483647;
        transform: translate3d(-9999px, -9999px, 0);
      }

      .${TRAIL_CLASS} {
        position: fixed;
        width: 10px;
        height: 10px;
        margin-left: -5px;
        margin-top: -5px;
        border-radius: 50%;
        background: rgba(0, 194, 255, 0.55);
        pointer-events: none;
        z-index: 2147483646;
        transform: translate3d(-9999px, -9999px, 0);
        opacity: 0.85;
        transition: opacity 500ms linear, transform 60ms linear;
      }

      .${TRAIL_CLASS}.fade {
        opacity: 0;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureCursor() {
    let cursor = document.getElementById(CURSOR_ID);
    if (cursor) return cursor;

    cursor = document.createElement("div");
    cursor.id = CURSOR_ID;
    document.documentElement.appendChild(cursor);
    return cursor;
  }

  function addTrail(x, y) {
    const dot = document.createElement("div");
    dot.className = TRAIL_CLASS;
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    document.documentElement.appendChild(dot);

    requestAnimationFrame(() => dot.classList.add("fade"));
    window.setTimeout(() => dot.remove(), 650);
  }

  function setCursor(x, y, down) {
    const cursor = ensureCursor();
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    cursor.style.borderColor = down ? "#ff3b30" : "#00c2ff";
    cursor.style.background = down
      ? "rgba(255, 59, 48, 0.22)"
      : "rgba(0, 194, 255, 0.18)";

    if (Math.abs(x - lastX) + Math.abs(y - lastY) > 2) addTrail(x, y);
    lastX = x;
    lastY = y;

    if (trailTimer) window.clearTimeout(trailTimer);
    trailTimer = window.setTimeout(() => {
      const c = document.getElementById(CURSOR_ID);
      if (c) c.style.opacity = "0.55";
    }, 120);
    cursor.style.opacity = "1";
  }

  function setFocused(el) {
    if (!(el instanceof Element)) return;
    document.querySelectorAll("." + FOCUS_CLASS).forEach((node) => {
      if (node !== el) node.classList.remove(FOCUS_CLASS);
    });
    el.classList.add(FOCUS_CLASS);
  }

  function clearFocused(el) {
    if (el instanceof Element) el.classList.remove(FOCUS_CLASS);
  }

  ensureStyles();
  ensureCursor();

  document.addEventListener(
    "mousemove",
    (e) => setCursor(e.clientX, e.clientY, false),
    true,
  );
  document.addEventListener(
    "mousedown",
    (e) => setCursor(e.clientX, e.clientY, true),
    true,
  );
  document.addEventListener(
    "mouseup",
    (e) => setCursor(e.clientX, e.clientY, false),
    true,
  );
  document.addEventListener("focusin", (e) => setFocused(e.target), true);
  document.addEventListener("focusout", (e) => clearFocused(e.target), true);
})();
