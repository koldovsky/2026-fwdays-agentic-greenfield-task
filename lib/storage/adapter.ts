export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createMemoryStorageAdapter(
  initial: Record<string, string> = {},
): StorageAdapter {
  const store = new Map(Object.entries(initial));

  return {
    getItem(key) {
      return store.get(key) ?? null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

export function createLocalStorageAdapter(): StorageAdapter | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const probe = "__tinystart_probe__";
    window.localStorage.setItem(probe, probe);
    window.localStorage.removeItem(probe);
  } catch {
    return null;
  }

  return {
    getItem(key) {
      return window.localStorage.getItem(key);
    },
    setItem(key, value) {
      window.localStorage.setItem(key, value);
    },
    removeItem(key) {
      window.localStorage.removeItem(key);
    },
  };
}
