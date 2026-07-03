import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleProfile {
  /** Stable Google account id (the token `sub`). */
  sub: string;
  email: string;
  /** Display name from the Google profile, if present. */
  name: string | null;
}

/**
 * Verifies a Google-issued id_token server-side (FR-AUTH-03, TC-STACK-04): checks
 * signature, issuer, and audience (our `GOOGLE_CLIENT_ID`). Injectable so tests can
 * override it with a stub verifier.
 */
@Injectable()
export class GoogleVerifier {
  private readonly client = new OAuth2Client();

  constructor(private readonly config: ConfigService) {}

  async verify(idToken: string): Promise<GoogleProfile> {
    const audience = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!audience) {
      throw new UnauthorizedException('Google sign-in is not configured.');
    }
    let payload;
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google token.');
    }
    if (!payload?.sub || !payload.email || !payload.email_verified) {
      throw new UnauthorizedException('Google account is not verified.');
    }
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name ?? payload.given_name ?? null,
    };
  }
}
