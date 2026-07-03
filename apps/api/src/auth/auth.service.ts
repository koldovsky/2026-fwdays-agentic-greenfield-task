import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import {
  validatePassword,
  type AuthProvider,
  type AuthSession,
  type AuthUser,
} from '@honeydo/shared';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleSignInDto } from './dto/google-sign-in.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { GoogleVerifier } from './google.verifier';
import { TokenService } from './token.service';

interface UserWithIdentities {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  identities: { provider: string }[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly google: GoogleVerifier,
  ) {}

  /** Email + password sign-up with shared strength validation (FR-AUTH-01). */
  async signUp(dto: SignUpDto): Promise<AuthSession> {
    const strength = validatePassword(dto.password);
    if (!strength.valid) {
      throw new BadRequestException(
        `Password must contain ${strength.errors.join(', ')}.`,
      );
    }
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name?.trim() || null,
        passwordHash,
        identities: {
          create: { provider: 'password', providerUserId: dto.email },
        },
      },
      include: { identities: true },
    });
    return this.startSession(user);
  }

  /** Email + password sign-in; invalid creds are rejected uniformly (FR-AUTH-02). */
  async signIn(dto: SignInDto): Promise<AuthSession> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { identities: true },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    return this.startSession(user);
  }

  /**
   * Google sign-in. Verifies the id_token, then returns the existing Google account,
   * links Google to an existing same-email account (FR-AUTH-04), or provisions a new
   * account (FR-AUTH-03).
   */
  async signInWithGoogle(dto: GoogleSignInDto): Promise<AuthSession> {
    const profile = await this.google.verify(dto.idToken);

    const identity = await this.prisma.authIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: 'google',
          providerUserId: profile.sub,
        },
      },
      include: { user: { include: { identities: true } } },
    });
    if (identity) {
      // Returning Google user. Backfill the name if we didn't have one yet (e.g. the
      // account predates name capture), so the profile fills in on next sign-in.
      if (!identity.user.name && profile.name) {
        const updated = await this.prisma.user.update({
          where: { id: identity.user.id },
          data: { name: profile.name },
          include: { identities: true },
        });
        return this.startSession(updated);
      }
      return this.startSession(identity.user);
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: profile.email },
      include: { identities: true },
    });
    if (existing) {
      // Link Google to the existing account rather than creating a duplicate;
      // backfill the name from Google if the account doesn't have one yet.
      const linked = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          name: existing.name ?? profile.name,
          identities: {
            create: { provider: 'google', providerUserId: profile.sub },
          },
        },
        include: { identities: true },
      });
      return this.startSession(linked);
    }

    const created = await this.prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        identities: {
          create: { provider: 'google', providerUserId: profile.sub },
        },
      },
      include: { identities: true },
    });
    return this.startSession(created);
  }

  /** Current authenticated user for a validated access token (FR-AUTH-06). */
  async getUser(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { identities: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.toAuthUser(user);
  }

  /** Issue tokens and shape the public session payload. */
  async startSession(user: UserWithIdentities): Promise<AuthSession> {
    const tokens = await this.tokens.issueTokens({
      id: user.id,
      email: user.email,
    });
    return { user: this.toAuthUser(user), tokens };
  }

  toAuthUser(user: {
    id: string;
    email: string;
    name: string | null;
    identities: { provider: string }[];
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      providers: user.identities.map((i) => i.provider as AuthProvider),
    };
  }
}
