import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../../generated/prisma/client';

// Explicit pool config instead of the raw URL: MySQL 8 `caching_sha2_password`
// needs RSA public key retrieval on first auth over plain TCP — without it the
// app cannot (re)connect once a DB restart clears the server-side auth cache
// (pool then times out forever). Local dev and the Railway private network
// make key retrieval without TLS an acceptable POC trade-off.
export function poolConfigFromUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    allowPublicKeyRetrieval: true,
    connectTimeout: 5_000,
    acquireTimeout: 10_000,
  };
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      adapter: new PrismaMariaDb(
        poolConfigFromUrl(process.env.DATABASE_URL ?? 'mysql://localhost'),
      ),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
