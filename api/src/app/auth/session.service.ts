import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { UserModel } from '../../generated/prisma/models';
import { PrismaService } from '../prisma/prisma.service';
import { AUTH_CONFIG, AuthConfig } from './auth-config';

// Server-side sessions (design D2): the cookie carries a 256-bit random
// opaque token; the DB stores only sha256(token), so a DB read/leak cannot
// mint valid cookies. Fixed 30-day window (FR-AUTH-04), revoked on logout.
@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUTH_CONFIG) private readonly config: AuthConfig,
  ) {}

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async create(userId: bigint): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.config.sessionTtlMs);
    await this.prisma.session.create({
      data: { tokenHash: this.hashToken(token), userId, expiresAt },
    });
    return { token, expiresAt };
  }

  async findUserByToken(token: string): Promise<UserModel | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt.getTime() <= Date.now()) return null;
    return session.user;
  }

  async revoke(token: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { tokenHash: this.hashToken(token) },
    });
  }
}
