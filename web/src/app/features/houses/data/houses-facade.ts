import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HousesApi } from './houses-api';
import { HouseDto, HouseInput, houseErrorMessage } from './house.model';

interface HousesState {
  houses: HouseDto[];
  loaded: boolean;
  loading: boolean;
  pending: boolean;
  error: string | null;
}

const INITIAL_STATE: HousesState = {
  houses: [],
  loaded: false,
  loading: false,
  pending: false,
  error: null,
};

@Injectable({ providedIn: 'root' })
export class HousesFacade {
  private readonly api = inject(HousesApi);
  private readonly state = signal<HousesState>(INITIAL_STATE);

  readonly houses = computed(() => this.state().houses);
  /** true once the first load answered — gates the empty state */
  readonly loaded = computed(() => this.state().loaded);
  readonly loading = computed(() => this.state().loading);
  readonly pending = computed(() => this.state().pending);
  readonly error = computed(() => this.state().error);

  async load(): Promise<void> {
    this.state.update((s) => ({ ...s, loading: true, error: null }));
    try {
      const houses = await firstValueFrom(this.api.list());
      this.state.update((s) => ({
        ...s,
        houses,
        loaded: true,
        loading: false,
      }));
    } catch (err) {
      this.state.update((s) => ({
        ...s,
        loading: false,
        error: houseErrorMessage(err),
      }));
    }
  }

  /** Resolves to true on success; on failure `error` holds Ukrainian copy. */
  create(input: HouseInput): Promise<boolean> {
    return this.mutate(() => firstValueFrom(this.api.create(input)));
  }

  update(id: number, input: HouseInput): Promise<boolean> {
    return this.mutate(() => firstValueFrom(this.api.update(id, input)));
  }

  remove(id: number): Promise<boolean> {
    return this.mutate(() => firstValueFrom(this.api.remove(id)));
  }

  // Reload-after-mutation (design D4): no local cache patching
  private async mutate(action: () => Promise<unknown>): Promise<boolean> {
    this.state.update((s) => ({ ...s, pending: true, error: null }));
    try {
      await action();
      this.state.update((s) => ({ ...s, pending: false }));
      await this.load();
      return true;
    } catch (err) {
      this.state.update((s) => ({
        ...s,
        pending: false,
        error: houseErrorMessage(err),
      }));
      return false;
    }
  }
}
