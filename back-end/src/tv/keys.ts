/**
 * MVP enumeration of Samsung remote-control keys the SPA can send. Any
 * value not in this union is rejected with a 400 at the route layer
 * before it ever reaches a TV — `AGENTS.md` house rule: no free-text
 * on-wire key strings.
 *
 * The corresponding on-wire envelope is Samsung's Smart View WebSocket
 * frame documented in
 * `openspec/changes/archive/2026-07-04-smart-view-ws-transport/design.md`
 * D1 (NOT the hotel-TV IP Control Postman collection — that protocol is
 * unrelated per AGENTS.md).
 */
export type SamsungKeyCode =
  | 'KEY_UP'
  | 'KEY_DOWN'
  | 'KEY_LEFT'
  | 'KEY_RIGHT'
  | 'KEY_ENTER'
  | 'KEY_RETURN'
  | 'KEY_HOME'
  | 'KEY_MENU'
  | 'KEY_POWER'
  | 'KEY_VOLUP'
  | 'KEY_VOLDOWN'
  | 'KEY_MUTE'
  | 'KEY_SOURCE'
  | 'KEY_HDMI'
  | 'KEY_HDMI1'
  | 'KEY_HDMI2'
  | 'KEY_HDMI3'
  | 'KEY_HDMI4'
  | 'KEY_TV'
  | 'KEY_AV1'
  | 'KEY_COMPONENT1';

/**
 * Keys exposed by the C6 `POST /api/devices/:udn/key` route. Volume keys
 * are intentionally NOT in this list — C7 `volume-control` owns them via
 * `POST /volume/delta` + `POST /mute` so the volume module can also flip
 * its optimistic mute tracker and emit `changed` events. Keeping the two
 * routes' vocabularies separate honours C6's own Non-Goals boundary.
 */
export const SAMSUNG_KEY_CODES: readonly SamsungKeyCode[] = [
  'KEY_UP',
  'KEY_DOWN',
  'KEY_LEFT',
  'KEY_RIGHT',
  'KEY_ENTER',
  'KEY_RETURN',
  'KEY_HOME',
  'KEY_MENU',
  'KEY_POWER',
];

/** Volume keys — used internally by `back-end/src/tv/volume.ts`. Not part
 *  of the C6 public `/key` schema. */
export const VOLUME_KEY_CODES: readonly SamsungKeyCode[] = [
  'KEY_VOLUP',
  'KEY_VOLDOWN',
  'KEY_MUTE',
];

export interface SmartViewKeyParams {
  Cmd: 'Click';
  DataOfCmd: SamsungKeyCode;
  Option: 'false';
  TypeOfRemote: 'SendRemoteKey';
}

/**
 * Build the `params` object for a single-press `ms.remote.control` frame.
 * MVP is Click-only — press/release is a Non-Goal in the change design.
 * Type-checked against `SmartViewKeyParams` at construction so shape
 * drift is caught at compile time, then returned as a plain record so
 * it drops straight into `JsonRpcTransport.call`'s `params` slot without
 * a spread or a widening cast at the callsite.
 */
export function keyControlParams(key: SamsungKeyCode): Record<string, unknown> {
  return {
    Cmd: 'Click',
    DataOfCmd: key,
    Option: 'false',
    TypeOfRemote: 'SendRemoteKey',
  } satisfies SmartViewKeyParams;
}
