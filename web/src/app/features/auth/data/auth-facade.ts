import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from './auth-api';
import { UserDto, authErrorMessage } from './auth.model';

// 'unknown' until the first GET /api/auth/me resolves on bootstrap
type AuthStatus = 'unknown' | 'guest' | 'authenticated';

interface AuthState {
  user: UserDto | null;
  status: AuthStatus;
  pending: boolean;
  error: string | null;
  codeRequested: boolean;
}

const INITIAL_STATE: AuthState = {
  user: null,
  status: 'unknown',
  pending: false,
  error: null,
  codeRequested: false,
};

@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly api = inject(AuthApi);
  private readonly state = signal<AuthState>(INITIAL_STATE);

  readonly user = computed(() => this.state().user);
  readonly status = computed(() => this.state().status);
  readonly pending = computed(() => this.state().pending);
  readonly error = computed(() => this.state().error);
  /** false → login step 1 (phone), true → step 2 (code) */
  readonly codeRequested = computed(() => this.state().codeRequested);

  // Session probe on bootstrap (design D9); the app guard awaits it.
  async init(): Promise<void> {
    if (this.state().status !== 'unknown') return;
    try {
      const user = await firstValueFrom(this.api.me());
      this.state.update((s) => ({ ...s, user, status: 'authenticated' }));
    } catch {
      this.state.update((s) => ({ ...s, user: null, status: 'guest' }));
    }
  }

  async requestOtp(phone: string): Promise<void> {
    this.state.update((s) => ({ ...s, pending: true, error: null }));
    try {
      await firstValueFrom(this.api.requestOtp(phone));
      this.state.update((s) => ({
        ...s,
        pending: false,
        codeRequested: true,
      }));
    } catch (err) {
      this.state.update((s) => ({
        ...s,
        pending: false,
        error: authErrorMessage(err),
      }));
    }
  }

  /** Resolves to true when the session is established. */
  async verifyOtp(phone: string, code: string): Promise<boolean> {
    this.state.update((s) => ({ ...s, pending: true, error: null }));
    try {
      const user = await firstValueFrom(this.api.verifyOtp(phone, code));
      this.state.set({
        ...INITIAL_STATE,
        user,
        status: 'authenticated',
      });
      return true;
    } catch (err) {
      this.state.update((s) => ({
        ...s,
        pending: false,
        error: authErrorMessage(err),
      }));
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.api.logout());
    } catch {
      // Even if the call fails, the user asked to leave — drop the
      // client-side state; the server session expires on its own.
    }
    this.state.set({ ...INITIAL_STATE, status: 'guest' });
  }

  async updateName(name: string | null): Promise<void> {
    this.state.update((s) => ({ ...s, pending: true, error: null }));
    try {
      const user = await firstValueFrom(this.api.updateName(name));
      this.state.update((s) => ({ ...s, user, pending: false }));
    } catch (err) {
      this.state.update((s) => ({
        ...s,
        pending: false,
        error: authErrorMessage(err),
      }));
    }
  }

  /** Back to the phone step of the login form. */
  resetLogin(): void {
    this.state.update((s) => ({ ...s, codeRequested: false, error: null }));
  }

  /** Called by the 401 interceptor: the server no longer knows this session. */
  // fallow-ignore-next-line unused-class-member
  sessionLost(): void {
    this.state.set({ ...INITIAL_STATE, status: 'guest' });
  }
}
