// The WEB extension of the neutral `core/contracts.FormatHandler`. It carries the one DOM mount type
// (the `createNavigator` mount param below) so it lives in `platform/web`, NEVER in `core/contracts` — the
// native client implements its own platform handler against the same neutral `FormatHandler` base. The
// reader resolves a handler from the registry (which returns the neutral `FormatHandler`) and narrows
// it with the runtime type guard below — a structural `typeof createNavigator === 'function'` check,
// NOT `instanceof EpubFormatHandler`, so the format plugin stays decoupled from this layer and a
// future sandbox-proxied handler still passes.

import type { FormatHandler, Navigator, NavigatorOptions } from '@/core/contracts'
import type { Publication } from '@/core/model'

/**
 * The web extension of the neutral {@link Navigator}. It adds only `pageCount()` — a viewport-dependent
 * page-total ESTIMATE that cannot be conformance-matched across platforms (D1), so it is web-only, not part
 * of the shared contract. Every other member the navigator exposes is the neutral `Navigator`.
 */
export interface WebNavigator extends Navigator {
  /** Total page count of the current layout (viewport-dependent estimate), or `undefined` pre-render. */
  pageCount(): number | undefined
}

/**
 * The web extension of the neutral {@link FormatHandler}. It adds the ONE genuinely web-bound member — the
 * navigator factory and its DOM mount target (the native client mounts its own view against the same
 * neutral base). That mount is the single DOM type in the whole Format/Navigator contract surface, and it
 * is allowed to appear ONLY in the `createNavigator` signature below.
 */
export interface WebFormatHandler extends FormatHandler {
  createNavigator(
    publication: Publication,
    mount: HTMLElement,
    options: NavigatorOptions,
  ): Promise<WebNavigator>
}

/**
 * Narrow a neutral `FormatHandler` to a {@link WebFormatHandler} by structural capability — the
 * handler exposes a `createNavigator` function. NOT `instanceof EpubFormatHandler`, so the format plugin
 * stays decoupled from this layer and a future sandbox-proxied handler still passes; a non-web platform's
 * handler is correctly rejected.
 */
export function isWebFormatHandler(handler: FormatHandler): handler is WebFormatHandler {
  return typeof (handler as Partial<WebFormatHandler>).createNavigator === 'function'
}
