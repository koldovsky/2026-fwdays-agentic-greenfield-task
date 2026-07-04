/** Internal per-TV session state. `Reconnecting` never leaves the back-end. */
export type SessionState =
  | { kind: 'Disconnected' }
  | { kind: 'Connecting'; since: number }
  | { kind: 'Connected'; since: number }
  | { kind: 'Reconnecting'; since: number; attempt: number }
  | { kind: 'Offline' };

/**
 * Client-visible session state. `Reconnecting` collapses to `Connecting`
 * so the UI stays simple — spec calls this out explicitly.
 */
export type ClientSessionState =
  | 'Disconnected'
  | 'Connecting'
  | 'Connected'
  | 'Offline';

export function toClientSessionState(state: SessionState): ClientSessionState {
  switch (state.kind) {
    case 'Reconnecting':
      return 'Connecting';
    case 'Connected':
      return 'Connected';
    case 'Connecting':
      return 'Connecting';
    case 'Offline':
      return 'Offline';
    case 'Disconnected':
    default:
      return 'Disconnected';
  }
}
