import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import type { Device, DeviceRegistry, RegistryEvent } from '../discovery/registry.js';
import type { SessionManager, SessionSnapshot } from '../tv/manager.js';
import type { VolumeModule, VolumeSnapshot, VolumeState } from '../tv/volume.js';
import { toClientSessionState, type ClientSessionState } from '../tv/types.js';

export type DevicesTopicEvent =
  | 'snapshot'
  | 'added'
  | 'updated'
  | 'removed'
  | 'offline'
  | 'session'
  | 'volume';

interface SnapshotDevice extends Device {
  session?: ClientSessionState;
  volume?: VolumeState;
}

interface DevicesMessage {
  topic: 'devices';
  event: DevicesTopicEvent;
  device?: Device;
  devices?: SnapshotDevice[];
  udn?: string;
  state?: ClientSessionState;
  level?: VolumeState['level'];
  muted?: VolumeState['muted'];
}

export interface DevicesBroker {
  register(socket: WebSocket): void;
  close(): void;
}

/**
 * Fan out registry events + per-UDN session events onto `/ws`. On every
 * new connection, sends a `snapshot` message whose `devices[i].session`
 * carries the current client-visible session state (`Connecting` /
 * `Connected` / `Disconnected` / `Offline`), so a client that reconnects
 * mid-session doesn't need a separate HTTP round-trip.
 */
export function createDevicesBroker(
  registry: DeviceRegistry,
  logger: FastifyInstance['log'],
  sessionManager?: SessionManager,
  volumeModule?: VolumeModule,
): DevicesBroker {
  const clients = new Set<WebSocket>();

  function broadcast(message: DevicesMessage): void {
    const raw = JSON.stringify(message);
    for (const socket of clients) {
      if (socket.readyState === socket.OPEN) {
        try {
          socket.send(raw);
        } catch (err) {
          logger.warn({ err, event: message.event }, 'devices broker: failed to send to client');
        }
      }
    }
  }

  const forwardRegistry =
    (event: Exclude<DevicesTopicEvent, 'snapshot' | 'session'>) =>
    (device: Device): void => {
      broadcast({ topic: 'devices', event, device });
    };

  const onAdded = forwardRegistry('added');
  const onUpdated = forwardRegistry('updated');
  const onRemoved = forwardRegistry('removed');
  const onOffline = forwardRegistry('offline');
  const onSession = (snapshot: SessionSnapshot): void => {
    broadcast({
      topic: 'devices',
      event: 'session',
      udn: snapshot.udn,
      state: toClientSessionState(snapshot.state),
    });
  };
  const onVolume = (snapshot: VolumeSnapshot): void => {
    broadcast({
      topic: 'devices',
      event: 'volume',
      udn: snapshot.udn,
      level: snapshot.state.level,
      muted: snapshot.state.muted,
    });
  };

  const registryListeners: Array<[RegistryEvent, (device: Device) => void]> = [
    ['added', onAdded],
    ['updated', onUpdated],
    ['removed', onRemoved],
    ['offline', onOffline],
  ];
  for (const [event, listener] of registryListeners) {
    registry.on(event, listener);
  }
  if (sessionManager) {
    sessionManager.on('state', onSession);
  }
  if (volumeModule) {
    volumeModule.on('changed', onVolume);
  }

  function buildSnapshot(): SnapshotDevice[] {
    const sessionByUdn = new Map<string, ClientSessionState>();
    if (sessionManager) {
      for (const { udn, state } of sessionManager.snapshot()) {
        sessionByUdn.set(udn, toClientSessionState(state));
      }
    }
    const volumeByUdn = new Map<string, VolumeState>();
    if (volumeModule) {
      for (const { udn, state } of volumeModule.snapshot()) {
        volumeByUdn.set(udn, state);
      }
    }
    return registry.snapshot().map((d) => {
      const session = sessionByUdn.get(d.udn);
      const volume = volumeByUdn.get(d.udn);
      const enriched: SnapshotDevice = { ...d };
      if (session !== undefined) enriched.session = session;
      if (volume !== undefined) enriched.volume = volume;
      return enriched;
    });
  }

  return {
    register(socket: WebSocket) {
      clients.add(socket);
      const snapshot: DevicesMessage = {
        topic: 'devices',
        event: 'snapshot',
        devices: buildSnapshot(),
      };
      try {
        socket.send(JSON.stringify(snapshot));
      } catch (err) {
        logger.warn({ err }, 'devices broker: failed to send snapshot');
      }
      socket.on('close', () => {
        clients.delete(socket);
      });
    },
    close() {
      for (const [event, listener] of registryListeners) {
        registry.off(event, listener);
      }
      if (sessionManager) sessionManager.off('state', onSession);
      if (volumeModule) volumeModule.off('changed', onVolume);
      clients.clear();
    },
  };
}
