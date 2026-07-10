// Prisma CLI config (Prisma 7). The schema and migrations live in api/
// (owned by the api app, design D2 of s01-walking-skeleton); this file sits
// at the repo root so CLI commands run from the workspace root and pick up
// the root .env.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'api/prisma/schema.prisma',
  migrations: {
    path: 'api/prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
