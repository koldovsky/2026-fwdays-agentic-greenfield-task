import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

// Protected-route contract (FR-AUTH-06): GET /auth/me requires a valid access token.
describe('Auth /me (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const email = `me-${Date.now()}@honeydo.test`;
  let accessToken: string;

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

    const res = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password: 'Honeydo1' })
      .expect(201);
    accessToken = res.body.tokens.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('rejects a request with no token (401)', () =>
    request(app.getHttpServer()).get('/auth/me').expect(401));

  it('rejects a request with an invalid token (401)', () =>
    request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401));

  it('returns the current user with a valid token', () =>
    request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        if (res.body.email !== email) throw new Error('wrong user');
        if (res.body.passwordHash !== undefined) throw new Error('leaked hash');
      }));
});
