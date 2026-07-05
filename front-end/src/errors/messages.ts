import { ApiError } from '../api/client.ts';
import type { ToastTone } from '../ui/useToast.ts';

export interface ToastMessage {
  tone: ToastTone;
  message: string;
}

/**
 * Central copy mapping for the SPA. Every `ApiError` code the back-end
 * emits maps to a tone + English sentence-case message. Keeping it here
 * means the mapping is unit-testable in isolation and any copy tweak is
 * one file, not scattered across hooks.
 *
 * Table mirrors design.md D3 in the archived `error-surfacing` change.
 */
export function messageFor(err: ApiError): ToastMessage {
  switch (err.code) {
    case 'TvNotReachable':
      return {
        tone: 'error',
        message: "Can't reach the TV. Check that it's on and on the same network.",
      };
    case 'TvNotSupported':
      return { tone: 'warning', message: "Your TV doesn't support this action." };
    case 'TvFailed':
      return { tone: 'error', message: "The TV didn't like that. Try again in a moment." };
    case 'TvInvalidOp':
      return { tone: 'error', message: "Something's off with that request." };
    case 'TvUnknown':
      return {
        tone: 'warning',
        message: 'Unexpected TV response. If this keeps happening, check the back-end log.',
      };
    case 'SessionNotConnected':
      return {
        tone: 'warning',
        message: "The TV isn't connected. Tap Connect to try again.",
      };
    case 'validation':
      return { tone: 'error', message: "That value isn't allowed here." };
    default:
      return {
        tone: 'error',
        message: 'The remote service had a hiccup. Please try again.',
      };
  }
}
