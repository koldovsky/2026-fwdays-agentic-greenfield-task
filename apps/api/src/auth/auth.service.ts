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
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { TokenService } from './token.service';

interface UserWithIdentities {
  id: string;
  email: string;
  passwordHash: string | null;
  identities: { provider: string }[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
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
    identities: { provider: string }[];
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      providers: user.identities.map((i) => i.provider as AuthProvider),
    };
  }
}
