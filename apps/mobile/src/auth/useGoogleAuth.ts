import { useEffect } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GOOGLE_CLIENT_ID } from '../config';
import { useAuth } from './AuthContext';

// Finishes the web-browser auth session when the app is resumed via redirect.
void WebBrowser.maybeCompleteAuthSession();

/**
 * Google OAuth 2.0 + PKCE via expo-auth-session (FR-AUTH-03). On success, forwards the
 * Google id_token to the API. `available` is false when no client id is configured.
 */
export function useGoogleAuth() {
  const { signInWithGoogle } = useAuth();
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.authentication?.idToken ?? response.params.id_token;
    if (idToken) void signInWithGoogle(idToken);
  }, [response, signInWithGoogle]);

  return {
    available: GOOGLE_CLIENT_ID !== '' && request !== null,
    signIn: () => promptAsync(),
  };
}
