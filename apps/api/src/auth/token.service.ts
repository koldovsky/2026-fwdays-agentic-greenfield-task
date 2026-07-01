import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import type { AuthTokens } from '@honeydo/shared';
import { PrismaService } from '../prisma/prisma.service';

interface AccessSubject {
  id: string;
  email: string;
}

/**
 * Issues, rotates, and revokes tokens. Access tokens are short-lived JWTs; refresh
 * tokens are high-entropy opaque strings stored ONLY as a sha256 hash (queryable, since
 * the token is random) with rotation + revocation (FR-AUTH-05, NFR-SEC-01).
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private refreshTtlMs(): number {
    const days = Number(this.config.get<string>('JWT_REFRESH_TTL_DAYS', '30'));
    return days * 24 * 60 * 60 * 1000;
  }

  signAccessToken(user: AccessSubject): string {
    // Secret + expiry come from JwtModule config (see auth.module.ts).
    return this.jwt.sign({ sub: user.id, email: user.email });
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const raw = randomBytes(32).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hash(raw),
        userId,
        expiresAt: new Date(Date.now() + this.refreshTtlMs()),
      },
    });
    return raw;
  }

  /** Issue a fresh access + refresh pair for a session start. */
  async issueTokens(user: AccessSubject): Promise<AuthTokens> {
    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.createRefreshToken(user.id);
    return { accessToken, refreshToken };
  }

  /**
   * Rotate a refresh token: validate it, invalidate it, and issue a new pair. Presenting
   * an already-rotated/revoked token triggers reuse detection — the whole chain for that
   * user is revoked (NFR-SEC-01).
   */
  async rotate(rawRefresh: string): Promise<AuthTokens> {
    const tokenHash = this.hash(rawRefresh);
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!row || row.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Invalid refresh token.');
    }
    if (row.revokedAt) {
      // Reuse of a rotated token — revoke every active token for this user.
      await this.prisma.refreshToken.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token has already been used.');
    }

    const accessToken = this.signAccessToken({
      id: row.user.id,
      email: row.user.email,
    });
    const refreshToken = await this.createRefreshToken(row.userId);
    const replacement = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(refreshToken) },
    });
    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date(), replacedById: replacement?.id },
    });
    return { accessToken, refreshToken };
  }

  /** Revoke a refresh token (sign-out). Unknown/expired tokens are treated as success. */
  async revoke(rawRefresh: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hash(rawRefresh), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
