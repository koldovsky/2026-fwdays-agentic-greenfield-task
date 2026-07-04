import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import type { Device, DeviceRegistry, RegistryEvent } from '../discovery/registry.js';

export type DevicesTopicEvent = 'snapshot' | 'added' | 'updated' | 'removed' | 'offline';

interface DevicesMessage {
  topic: 'devices';
  event: DevicesTopicEvent;
  device?: Device;
  devices?: Device[];
}

export interface DevicesBroker {
  register(socket: WebSocket): void;
  close(): void;
}

/**
 * Fan out registry events onto `/ws`. On every new connection, sends a
 * `snapshot` message so a client that connected after the initial burst
 * still gets the full state without a separate HTTP round-trip.
 */
export function createDevicesBroker(
  registry: DeviceRegistry,
  logger: FastifyInstance['log'],
): DevicesBroker {
  const clients = new Set<WebSocket>();

  const forward =
    (event: DevicesTopicEvent) =>
    (device: Device): void => {
      const message = JSON.stringify({ topic: 'devices', event, device } satisfies DevicesMessage);
      for (const socket of clients) {
        if (socket.readyState === socket.OPEN) {
          try {
            socket.send(message);
          } catch (err) {
            logger.warn({ err, event }, 'devices broker: failed to send to client');
          }
        }
      }
    };

  const onAdded = forward('added');
  const onUpdated = forward('updated');
  const onRemoved = forward('removed');
  const onOffline = forward('offline');

  const eventListeners: Array<[RegistryEvent, (device: Device) => void]> = [
    ['added', onAdded],
    ['updated', onUpdated],
    ['removed', onRemoved],
    ['offline', onOffline],
  ];
  for (const [event, listener] of eventListeners) {
    registry.on(event, listener);
  }

  return {
    register(socket: WebSocket) {
      clients.add(socket);
      const snapshot: DevicesMessage = {
        topic: 'devices',
        event: 'snapshot',
        devices: registry.snapshot(),
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
      for (const [event, listener] of eventListeners) {
        registry.off(event, listener);
      }
      clients.clear();
    },
  };
}
