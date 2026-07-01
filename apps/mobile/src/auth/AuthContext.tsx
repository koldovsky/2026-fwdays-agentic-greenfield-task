import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { AuthSession, AuthUser } from '@honeydo/shared';
import { apiRequest, setUnauthorizedHandler } from '../api/client';
import { clearTokens, getRefreshToken, saveTokens } from './tokenStore';

type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  const applySession = useCallback(async (session: AuthSession) => {
    await saveTokens(session.tokens);
    setUser(session.user);
    setStatus('signedIn');
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const session = await apiRequest<AuthSession>('/auth/signin', {
        method: 'POST',
        body: { email, password },
        auth: false,
      });
      await applySession(session);
    },
    [applySession],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      const session = await apiRequest<AuthSession>('/auth/signup', {
        method: 'POST',
        body: { email, password },
        auth: false,
      });
      await applySession(session);
    },
    [applySession],
  );

  const signInWithGoogle = useCallback(
    async (idToken: string) => {
      const session = await apiRequest<AuthSession>('/auth/google', {
        method: 'POST',
        body: { idToken },
        auth: false,
      });
      await applySession(session);
    },
    [applySession],
  );

  const signOut = useCallback(async () => {
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
    setUser(null);
    setStatus('signedOut');
  }, []);

  // Restore a session on launch: if a refresh token exists, /auth/me (with the
  // client's refresh-on-401) revives it; otherwise start signed out.
  useEffect(() => {
    let active = true;
    const restore = async () => {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        if (active) setStatus('signedOut');
        return;
      }
      try {
        const me = await apiRequest<AuthUser>('/auth/me');
        if (active) {
          setUser(me);
          setStatus('signedIn');
        }
      } catch {
        await clearTokens();
        if (active) setStatus('signedOut');
      }
    };
    void restore();
    return () => {
      active = false;
    };
  }, []);

  // When the client gives up on a 401, drop to signed-out.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus('signedOut');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, signUp, signInWithGoogle, signOut }),
    [status, user, signIn, signUp, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
