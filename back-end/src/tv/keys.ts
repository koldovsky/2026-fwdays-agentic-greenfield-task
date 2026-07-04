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
  | 'KEY_POWER';

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
