import { create } from 'zustand';
import type { AuthSession, AuthUser } from '@honeydo/shared';
import { apiRequest, setUnauthorizedHandler } from '../api/client';
import { clearTokens, getRefreshToken, saveTokens } from '../auth/tokenStore';

type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

interface AuthStore {
  status: AuthStatus;
  user: AuthUser | null;
  /** Restore a session on launch (called once from the app root). */
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => {
  const applySession = async (session: AuthSession): Promise<void> => {
    await saveTokens(session.tokens);
    set({ user: session.user, status: 'signedIn' });
  };

  const authenticate = async (path: string, body: unknown): Promise<void> => {
    const session = await apiRequest<AuthSession>(path, {
      method: 'POST',
      body,
      auth: false,
    });
    await applySession(session);
  };

  return {
    status: 'loading',
    user: null,

    init: async () => {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        set({ status: 'signedOut' });
        return;
      }
      try {
        const me = await apiRequest<AuthUser>('/auth/me');
        set({ user: me, status: 'signedIn' });
      } catch {
        await clearTokens();
        set({ status: 'signedOut' });
      }
    },

    signIn: (email, password) => authenticate('/auth/signin', { email, password }),
    signUp: (email, password, name) =>
      authenticate('/auth/signup', { email, password, name: name?.trim() || undefined }),
    signInWithGoogle: (idToken) => authenticate('/auth/google', { idToken }),

    signOut: async () => {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        try {
          await apiRequest<void>('/auth/logout', {
            method: 'POST',
            body: { refreshToken },
            auth: false,
          });
        } catch {
          // best-effort; clear locally regardless
        }
      }
      await clearTokens();
      set({ user: null, status: 'signedOut' });
    },
  };
});

// When the API client exhausts its refresh on a 401, drop the store to signed-out.
setUnauthorizedHandler(() =>
  useAuthStore.setState({ user: null, status: 'signedOut' }),
);
