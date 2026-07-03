import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

// Exercises the auth capability end-to-end against the real DB (FR-AUTH-01/02/05,
// NFR-SEC-01). Requires Postgres up (npm run db:up) + migrations applied.
describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const email = `e2e-${Date.now()}@honeydo.test`;
  const password = 'Honeydo1';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('signs up a new account and returns tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password })
      .expect(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.providers).toEqual(['password']);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.tokens.accessToken).toBeTruthy();
    expect(res.body.tokens.refreshToken).toBeTruthy();
  });

  it('rejects a weak password (400)', () =>
    request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: `weak-${email}`, password: 'abc' })
      .expect(400));

  it('rejects a duplicate email (409)', () =>
    request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password })
      .expect(409));

  it('signs in with valid credentials', () =>
    request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email, password })
      .expect(200)
      .expect((res) => {
        if (!res.body.tokens.accessToken) throw new Error('no access token');
      }));

  it('rejects invalid credentials (401)', () =>
    request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email, password: 'Wrong123' })
      .expect(401));

  it('rotates a refresh token and rejects reuse of the old one', async () => {
    const signin = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email, password })
      .expect(200);
    const oldRefresh = signin.body.tokens.refreshToken as string;

    const rotated = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(200);
    expect(rotated.body.refreshToken).toBeTruthy();
    expect(rotated.body.refreshToken).not.toBe(oldRefresh);

    // Reusing the rotated (now revoked) token is rejected.
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(401);
  });

  it('revokes the refresh token on logout', async () => {
    const signin = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({ email, password })
      .expect(200);
    const refresh = signin.body.tokens.refreshToken as string;

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: refresh })
      .expect(204);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: refresh })
      .expect(401);
  });
});
