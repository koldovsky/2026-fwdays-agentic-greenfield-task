import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { GoogleVerifier } from './../src/auth/google.verifier';
import { PrismaService } from './../src/prisma/prisma.service';

// Google sign-in with a stubbed verifier (FR-AUTH-03/04). The stub reads the "id_token"
// as JSON {sub,email} so each test controls the verified profile.
describe('Auth Google (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const ts = Date.now();
  const provisionEmail = `g-provision-${ts}@honeydo.test`;
  const linkEmail = `g-link-${ts}@honeydo.test`;

  const token = (sub: string, email: string) => JSON.stringify({ sub, email });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GoogleVerifier)
      .useValue({
        verify: (idToken: string) => Promise.resolve(JSON.parse(idToken)),
      })
      .compile();
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
    await prisma.user.deleteMany({
      where: { email: { in: [provisionEmail, linkEmail] } },
    });
    await app.close();
  });

  it('provisions a new account on first Google sign-in', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/google')
      .send({ idToken: token('google-prov', provisionEmail) })
      .expect(200);
    expect(res.body.user.email).toBe(provisionEmail);
    expect(res.body.user.providers).toEqual(['google']);
    expect(res.body.tokens.accessToken).toBeTruthy();
  });

  it('links Google to an existing same-email password account (no duplicate)', async () => {
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: linkEmail, password: 'Honeydo1' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/auth/google')
      .send({ idToken: token('google-link', linkEmail) })
      .expect(200);
    expect(res.body.user.providers.sort()).toEqual(['google', 'password']);

    const count = await prisma.user.count({ where: { email: linkEmail } });
    expect(count).toBe(1);
  });
});
