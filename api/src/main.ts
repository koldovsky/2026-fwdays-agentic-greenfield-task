import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { createAppLogger } from './app/logging/app-logger';
import { createRequestLogger } from './app/logging/request-logger.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: createAppLogger(process.env),
  });
  app.use(createRequestLogger(process.env.NODE_ENV === 'production'));
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  // Graceful Prisma disconnect on SIGTERM/SIGINT (container stop on Railway)
  app.enableShutdownHooks();
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
