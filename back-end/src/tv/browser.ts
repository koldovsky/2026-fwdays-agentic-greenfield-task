/**
 * C10 wire helper — Samsung Smart View WebSocket envelope for launching a
 * URL in the TV's built-in Tizen browser. Uses the `ms.channel.emit` /
 * `ed.apps.launch` envelope family (different from C6/C7/C8's
 * `ms.remote.control`); see `openspec/specs/tv-browser-launch/spec.md`
 * and the archived `smart-view-ws-transport` design.md D1 for the
 * transport layer that carries this frame.
 */
export interface LaunchBrowserParams {
  event: 'ed.apps.launch';
  to: 'host';
  data: {
    appId: 'org.tizen.browser';
    action_type: 'NATIVE_LAUNCH';
    metaTag: string;
  };
}

/**
 * Build the `params` object for one `ms.channel.emit` frame carrying an
 * `ed.apps.launch` payload aimed at the Tizen browser. The URL becomes
 * `data.metaTag` — the field Tizen's browser app reads for its initial
 * navigation target. Type-checked against `LaunchBrowserParams` at
 * construction so shape drift is caught at compile time (same pattern as
 * `keyControlParams` in `back-end/src/tv/keys.ts`).
 */
export function launchBrowserParams(url: string): Record<string, unknown> {
  return {
    event: 'ed.apps.launch',
    to: 'host',
    data: {
      appId: 'org.tizen.browser',
      action_type: 'NATIVE_LAUNCH',
      metaTag: url,
    },
  } satisfies LaunchBrowserParams;
}
