export type DeviceStatus = 'online' | 'offline' | 'connecting';

/**
 * Shape of a device as emitted by `upnp-tv-discovery` on both
 * `GET /api/devices` and the `/ws` `devices` topic.
 *
 * There is no `AccessToken` field on the wire and there is no
 * `AccessToken` field here — the SPA never sees a TV credential.
 * See `AGENTS.md` house rule.
 */
export interface Device {
  udn: string;
  name: string;
  model: string | null;
  ip: string;
  port: number;
  status: DeviceStatus;
  lastSeen: number;
}

export type DevicesTopicEvent =
  | 'snapshot'
  | 'added'
  | 'updated'
  | 'removed'
  | 'offline';

export interface DevicesTopicMessage {
  topic: 'devices';
  event: DevicesTopicEvent;
  device?: Device;
  devices?: Device[];
}
