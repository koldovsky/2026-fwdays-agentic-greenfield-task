import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Global request validation for every class-validator DTO (TC-STACK-02):
  // strip unknown fields, reject extras, and coerce payloads to their DTO types.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // Default 3333 to avoid the commonly-occupied :3000 (override with PORT in .env).
  await app.listen(process.env.PORT ?? 3333);
}
void bootstrap();
