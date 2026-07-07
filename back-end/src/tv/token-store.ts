import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

/**
 * Per-UDN AccessToken persistence. Plain JSON at `0600` on disk — see
 * `design.md` D4 for the rationale (single-user LAN, no key management).
 * NEVER exposed to the front-end.
 */

export interface TokenStore {
  loadTokens(): Promise<Record<string, string>>;
  saveToken(udn: string, token: string): Promise<void>;
  getPath(): string;
}

function resolveTokenPath(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg && xdg.length > 0) return join(xdg, 'mytv', 'tokens.json');
  return join(homedir(), '.mytv', 'tokens.json');
}

export interface CreateTokenStoreOptions {
  /** Override for tests. */
  path?: string;
}

export function createTokenStore(options: CreateTokenStoreOptions = {}): TokenStore {
  const path = options.path ?? resolveTokenPath();
  let cache: Record<string, string> | null = null;

  async function loadTokens(): Promise<Record<string, string>> {
    if (cache) return { ...cache };
    try {
      const raw = await readFile(path, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        cache = {};
        return {};
      }
      cache = {};
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof value === 'string') cache[key] = value;
      }
      return { ...cache };
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        cache = {};
        return {};
      }
      // Malformed / unreadable — start empty rather than crashing.
      cache = {};
      return {};
    }
  }

  async function saveToken(udn: string, token: string): Promise<void> {
    await loadTokens();
    const next = { ...(cache ?? {}), [udn]: token };
    cache = next;
    await mkdir(dirname(path), { recursive: true });
    const serialized = JSON.stringify(next, null, 2);
    // Atomic write: write to sibling temp file, chmod 0600 before rename
    // so no reader ever sees a world-readable copy.
    const tmp = `${path}.tmp`;
    await writeFile(tmp, serialized, { mode: 0o600 });
    await chmod(tmp, 0o600);
    await rename(tmp, path);
    await chmod(path, 0o600);
  }

  return {
    loadTokens,
    saveToken,
    getPath() {
      return path;
    },
  };
}
