import { z } from 'zod';

// Single source for runtime configuration. Secrets are read from the environment ONLY
// (invariant #9) — never from the repo or the database. Required vars must be present for the
// bot to boot; NOTION_* stay optional until the M7 mirror (the bot must boot without them).
const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  // Required so a misconfigured deploy fails fast, even though `pipe` makes no LLM call yet.
  ANTHROPIC_API_KEY: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  NOTION_TOKEN: z.string().min(1).optional(),
  NOTION_DB_FOODLOG_ID: z.string().min(1).optional(),
  NOTION_DB_REVIEWS_ID: z.string().min(1).optional(),
  NOTION_DB_METRICS_ID: z.string().min(1).optional(),
  NOTION_DB_FOODDB_ID: z.string().min(1).optional(),
  TZ: z.string().min(1).default('Europe/Kyiv'),
});

export type Env = Readonly<z.infer<typeof envSchema>>;

/** Thrown when the environment fails schema validation. Message names every offending key. */
export class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

/**
 * Parse and validate the environment into a frozen, typed config object.
 * Pure — no process exit, no logging — so it is unit-testable. The caller decides how to react
 * to {@link EnvValidationError} (the entrypoint exits non-zero; see loadEnvOrExit).
 */
export const loadEnv = (source: NodeJS.ProcessEnv = process.env): Env => {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new EnvValidationError(`Invalid environment:\n${issues}`);
  }
  return Object.freeze(parsed.data);
};
