import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '../config';
import { useAuthStore } from '../store/authStore';

// Native Google Sign-In (FR-AUTH-03). The iOS client identifies the app; the Web client
// is the id_token audience (serverClientId) so the API verifies it against its
// GOOGLE_CLIENT_ID — no browser redirect, no redirect_uri config.
const configured = GOOGLE_IOS_CLIENT_ID !== '' && GOOGLE_WEB_CLIENT_ID !== '';
if (configured) {
  GoogleSignin.configure({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });
}

export function useGoogleAuth() {
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);

  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (isSuccessResponse(response) && response.data.idToken) {
        await signInWithGoogle(response.data.idToken);
      }
    } catch (e) {
      // Swallow the user cancelling the sheet; other failures surface in logs.
      if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) return;
      console.warn('Google sign-in failed', e);
    }
  };

  return { available: configured, signIn };
}
