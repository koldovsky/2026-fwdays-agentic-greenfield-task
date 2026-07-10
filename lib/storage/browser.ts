import {
  createLocalStorageAdapter,
  createMemoryStorageAdapter,
} from "@/lib/storage/adapter";
import { TinyStartStorage } from "@/lib/storage/index";

let browserStorage: TinyStartStorage | null = null;

export function getBrowserStorage(): TinyStartStorage {
  if (!browserStorage) {
    const adapter =
      createLocalStorageAdapter() ?? createMemoryStorageAdapter();
    browserStorage = new TinyStartStorage(adapter);
  }

  return browserStorage;
}

export function resetBrowserStorageForTests(): void {
  browserStorage = null;
}
