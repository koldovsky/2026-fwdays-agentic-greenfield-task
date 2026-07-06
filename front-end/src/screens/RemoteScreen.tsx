import { useEffect, useState } from 'react';
import { IconButton } from '@ds/components/core/IconButton.jsx';
import { Badge } from '@ds/components/core/Badge.jsx';
import { DPad } from '@ds/components/controls/DPad.jsx';
import { RotaryKnob } from '@ds/components/controls/RotaryKnob.jsx';
import { AppShortcut } from '@ds/components/controls/AppShortcut.jsx';
import { useDeviceSession, type ClientSessionState } from '../data/useDeviceSession.ts';
import { useSendKey, type UseSendKeyOptions } from '../data/useSendKey.ts';
import { useVolume, type UseVolumeOptions } from '../data/useVolume.ts';
import { useInputs, type UseInputsOptions } from '../data/useInputs.ts';
import { InputsModal } from './InputsModal.tsx';
import { WsHealthChip } from '../ui/WsHealthChip.tsx';
import type { SamsungKeyCode } from '../data/keys.ts';
import type { Device } from '../data/types.ts';

function sessionToBadgeStatus(
  state: ClientSessionState,
): 'online' | 'offline' | 'connecting' {
  switch (state) {
    case 'Connected':
      return 'online';
    case 'Connecting':
      return 'connecting';
    case 'Offline':
    case 'Disconnected':
    default:
      return 'offline';
  }
}

const DIRECTION_TO_KEY: Record<'up' | 'down' | 'left' | 'right', SamsungKeyCode> = {
  up: 'KEY_UP',
  down: 'KEY_DOWN',
  left: 'KEY_LEFT',
  right: 'KEY_RIGHT',
};

export interface RemoteScreenProps {
  device: Device;
  onBack: () => void;
  /** Injectable for tests. */
  sendKeyOptions?: UseSendKeyOptions;
  /** Injectable for tests. */
  useVolumeOptions?: UseVolumeOptions;
  /** Injectable for tests. */
  useInputsOptions?: UseInputsOptions;
}

export function RemoteScreen({ device, onBack, sendKeyOptions, useVolumeOptions, useInputsOptions }: RemoteScreenProps) {
  const [isInputsModalOpen, setInputsModalOpen] = useState(false);
  const { state, connect, disconnect } = useDeviceSession(device.udn);
  const { sendKey } = useSendKey(device.udn, sendKeyOptions);
  const { muted, delta: sendDelta, toggleMute } = useVolume(device.udn, useVolumeOptions);
  const { inputs, setInput } = useInputs(device.udn, useInputsOptions);

  // Auto-close the inputs modal if the session state leaves Connected —
  // the rows would be non-actionable anyway (disabled), so the friendlier
  // behaviour is to close and let the user reopen after reconnect.
  useEffect(() => {
    if (isInputsModalOpen && state !== 'Connected') {
      setInputsModalOpen(false);
    }
  }, [isInputsModalOpen, state]);

  useEffect(() => {
    void connect().catch(() => {
      /* silent — error-surfacing owns user-visible failures */
    });
  }, [connect]);

  const isConnected = state === 'Connected';
  // AppShortcut still lacks a `disabled` prop (it's placeholder art for a
  // future app-launch capability). Only the AppShortcut row falls back to
  // the token-consistent overlay pattern; DPad, RotaryKnob, and IconButton
  // all accept `disabled` directly.
  const disabledStyle = isConnected
    ? undefined
    : { opacity: 0.55, pointerEvents: 'none' as const };

  async function handleBack() {
    try {
      await disconnect();
    } catch {
      /* proceed with navigation even if the disconnect POST fails */
    }
    onBack();
  }

  function send(key: SamsungKeyCode): void {
    void sendKey(key).catch(() => {
      /* useSendKey already logged; UI-level surfacing lives in error-surfacing */
    });
  }

  function handleStep(direction: 'up' | 'down'): void {
    void sendDelta(direction === 'up' ? 1 : -1).catch(() => {
      /* useVolume already logged */
    });
  }

  function handleMuteClick(): void {
    void toggleMute().catch(() => {
      /* useVolume already logged */
    });
  }

  return (
    <div style={{ minHeight: '100%', padding: '32px 40px' }}>
      <div style={{ maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <IconButton icon="arrow_back" size="sm" onClick={handleBack} aria-label="Back" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 'var(--text-body-lg)', fontWeight: 700, color: 'var(--fg-1)' }}>{device.name}</div>
            <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--fg-2)' }}>{device.ip}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <WsHealthChip />
            <Badge status={sessionToBadgeStatus(state)} />
          </div>
        </div>

        <div
          aria-disabled={!isConnected}
          style={{ display: 'flex', gap: 18, justifyContent: 'space-between', padding: '4px 6px', ...disabledStyle }}
        >
          <AppShortcut icon="live_tv" label="Live TV" />
          <AppShortcut icon="movie" label="Movies" />
          <AppShortcut icon="sports_esports" label="Games" />
          <AppShortcut icon="apps" label="Apps" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <DPad
            size={220}
            disabled={!isConnected}
            onDirection={(dir: 'up' | 'down' | 'left' | 'right') => send(DIRECTION_TO_KEY[dir])}
            onSelect={() => send('KEY_ENTER')}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 18 }}>
          <IconButton
            icon="keyboard_backspace"
            aria-label="Back"
            disabled={!isConnected}
            onClick={() => send('KEY_RETURN')}
          />
          <IconButton
            icon="home"
            aria-label="Home"
            disabled={!isConnected}
            onClick={() => send('KEY_HOME')}
          />
          <IconButton
            icon="menu"
            aria-label="Menu"
            disabled={!isConnected}
            onClick={() => send('KEY_MENU')}
          />
          <IconButton
            icon="input"
            aria-label="Inputs"
            disabled={!isConnected}
            onClick={() => setInputsModalOpen(true)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
          <RotaryKnob
            size={200}
            disabled={!isConnected}
            onStep={handleStep}
            center={
              <IconButton
                icon={muted ? 'volume_off' : 'volume_up'}
                active={muted}
                size="md"
                onClick={handleMuteClick}
                aria-label="Mute"
                disabled={!isConnected}
              />
            }
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
          <IconButton
            icon="power_settings_new"
            tone="accent"
            size="lg"
            aria-label="Power"
            disabled={!isConnected}
            onClick={() => send('KEY_POWER')}
          />
        </div>
      </div>

      <InputsModal
        open={isInputsModalOpen}
        onClose={() => setInputsModalOpen(false)}
        state={state}
        inputs={inputs}
        setInput={setInput}
      />
    </div>
  );
}
