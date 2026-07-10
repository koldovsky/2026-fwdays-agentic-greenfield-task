import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DynamicModule, Logger, Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';

// Single container (TC-STACK-02, ADR-0002): the API process serves the SPA
// build. The default path works both in the Docker image (/app/api +
// /app/web/browser) and for a local `node dist/api/main.js` (dist/api +
// dist/web/browser); WEB_DIST_PATH overrides it. In dev (`nx serve api`)
// the folder usually does not exist — the SPA lives on the 4200 dev server —
// so static serving is simply skipped.
@Module({})
export class SpaModule {
  static forRoot(): DynamicModule {
    const webDist =
      process.env.WEB_DIST_PATH ?? join(__dirname, '..', 'web', 'browser');

    if (!existsSync(join(webDist, 'index.html'))) {
      new Logger(SpaModule.name).log(
        `SPA build not found at ${webDist} — static serving disabled (dev mode)`,
      );
      return { module: SpaModule, imports: [] };
    }

    return {
      module: SpaModule,
      imports: [
        ServeStaticModule.forRoot({
          rootPath: webDist,
          // Unknown /api/* paths must stay JSON 404s from Nest, never the SPA
          exclude: ['/api/{*path}'],
        }),
      ],
    };
  }
}
