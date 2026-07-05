/**
 * Client-side mirror of `back-end/src/tv/inputs.ts` `SamsungInputKey` +
 * `INPUT_CATALOGUE`. Kept in sync manually — the two files are the wire
 * contract. `GET /api/devices/:udn/inputs` returns exactly this shape.
 */
export type SamsungInputKey =
  | 'KEY_SOURCE'
  | 'KEY_HDMI'
  | 'KEY_HDMI1'
  | 'KEY_HDMI2'
  | 'KEY_HDMI3'
  | 'KEY_HDMI4'
  | 'KEY_TV'
  | 'KEY_AV1'
  | 'KEY_COMPONENT1';

export interface InputCatalogueEntry {
  id: SamsungInputKey;
  label: string;
}
