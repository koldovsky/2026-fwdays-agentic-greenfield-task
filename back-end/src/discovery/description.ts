import { XMLParser } from 'fast-xml-parser';
import { request } from 'undici';

export interface DeviceDescription {
  udn: string;
  name: string;
  model: string | null;
  manufacturer: string;
  modelName: string | null;
}

export interface FetchDescriptionOptions {
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 3000;

const SAMSUNG_MANUFACTURER = /samsung/i;
const SAMSUNG_MODEL_PREFIX = /^(UN|QN|KS|The Frame|The Serif|The Terrace)/i;

/**
 * Fetch the UPnP device description XML at `location` and extract the
 * fields the registry needs. Returns `null` for any failure (network,
 * timeout, malformed XML, missing UDN) — the caller treats it as "skip
 * this hit."
 */
export async function fetchDescription(
  location: string,
  options: FetchDescriptionOptions = {},
): Promise<DeviceDescription | null> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const { statusCode, body } = await request(location, {
      method: 'GET',
      signal: controller.signal,
    });
    if (statusCode < 200 || statusCode >= 300) {
      await body.dump();
      return null;
    }
    const xml = await body.text();
    return parseDescriptionXml(xml);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse a UPnP device description XML string. Extracts the `device`
 * subtree; UPnP roots may nest a single `device` or a `deviceList` — we
 * only care about the root device.
 */
export function parseDescriptionXml(xml: string): DeviceDescription | null {
  let doc: Record<string, unknown>;
  try {
    const parser = new XMLParser({ ignoreAttributes: true, trimValues: true });
    doc = parser.parse(xml) as Record<string, unknown>;
  } catch {
    return null;
  }

  const root = (doc.root ?? doc) as Record<string, unknown>;
  const device = (root.device ?? {}) as Record<string, unknown>;

  const udnRaw = typeof device.UDN === 'string' ? device.UDN : '';
  if (!udnRaw) return null;
  const udn = udnRaw.replace(/^uuid:/i, '');

  const name = typeof device.friendlyName === 'string' ? device.friendlyName : '';
  const manufacturer =
    typeof device.manufacturer === 'string' ? device.manufacturer : '';
  const modelName =
    typeof device.modelName === 'string' ? device.modelName : null;
  const modelNumber =
    typeof device.modelNumber === 'string' ? device.modelNumber : null;
  const model = modelName ?? modelNumber;

  return { udn, name, manufacturer, modelName, model };
}

/** True if this UPnP description looks like a Samsung television. */
export function isSamsungTv(description: DeviceDescription): boolean {
  if (SAMSUNG_MANUFACTURER.test(description.manufacturer)) return true;
  if (
    description.modelName &&
    SAMSUNG_MODEL_PREFIX.test(description.modelName)
  ) {
    return true;
  }
  return false;
}
