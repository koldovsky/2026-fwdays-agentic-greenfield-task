import { EmailnatorError, toErrorResponse } from "./errors.server.ts";
import {
  runDetailAction,
  runGenerateAction,
  runListAction,
  type Phase0Environment,
} from "./phase0.server.ts";
import { safeSecretEquals } from "./capsule.server.ts";
import { phase0ProbeRequestSchema, type Phase0ProbeRequest } from "./schemas.server.ts";

export interface ProbeHandlerDependencies {
  env?: Record<string, string | undefined>;
  actions?: {
    generate?: () => Promise<Record<string, unknown>>;
    list?: (capsule: string) => Promise<Record<string, unknown>>;
    detail?: (capsule: string, messageId: string) => Promise<Record<string, unknown>>;
  };
}

function getEnv(dependencies?: ProbeHandlerDependencies) {
  return dependencies?.env ?? process.env;
}

function requirePreviewAccess(env: Record<string, string | undefined>) {
  if (env.VERCEL_ENV === "production") {
    throw new EmailnatorError("PREVIEW_ONLY", "The probe is explicitly disabled in Production.", {
      status: 403,
    });
  }

  if (env.VERCEL_ENV !== "preview") {
    throw new EmailnatorError(
      "PREVIEW_ONLY",
      "The probe only runs in Vercel Preview deployments.",
      {
        status: 403,
      },
    );
  }

  if (env.EMAILNATOR_PROBE_ENABLED !== "true") {
    throw new EmailnatorError("PROBE_DISABLED", "The Emailnator probe is disabled.", {
      status: 403,
    });
  }
}

function requireBearerToken(request: Request, env: Record<string, string | undefined>): void {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    throw new EmailnatorError("AUTH_MISSING", "Missing Authorization bearer token.", {
      status: 401,
    });
  }

  const provided = header.slice("Bearer ".length);
  const expected = env.PHASE0_PROBE_TOKEN;
  if (!expected) {
    throw new EmailnatorError("CONFIG_INVALID", "PHASE0_PROBE_TOKEN is not configured.", {
      status: 500,
    });
  }

  if (!safeSecretEquals(provided, expected)) {
    throw new EmailnatorError("AUTH_INVALID", "Invalid Authorization bearer token.", {
      status: 401,
    });
  }
}

async function parseBody(request: Request): Promise<Phase0ProbeRequest> {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    throw new EmailnatorError("VALIDATION_FAILED", "The probe request body must be valid JSON.", {
      cause: error,
      status: 400,
    });
  }

  const parsed = phase0ProbeRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new EmailnatorError("VALIDATION_FAILED", "The probe request body is invalid.", {
      status: 400,
      details: { issues: parsed.error.issues.map((issue) => issue.message) },
    });
  }

  return parsed.data;
}

function createPhase0Env(env: Record<string, string | undefined>): Phase0Environment {
  return {
    PHASE0_SESSION_KEY: env.PHASE0_SESSION_KEY,
  };
}

export async function handleEmailnatorProbeRequest(
  request: Request,
  dependencies?: ProbeHandlerDependencies,
): Promise<Response> {
  try {
    if (request.method !== "POST") {
      throw new EmailnatorError("METHOD_NOT_ALLOWED", "Only POST is supported.", { status: 405 });
    }

    const env = getEnv(dependencies);
    requirePreviewAccess(env);
    requireBearerToken(request, env);

    const payload = await parseBody(request);
    const actions = dependencies?.actions;

    switch (payload.action) {
      case "generate": {
        const result: Record<string, unknown> = actions?.generate
          ? await actions.generate()
          : await runGenerateAction(createPhase0Env(env));
        return Response.json({ ok: true, ...result });
      }
      case "list": {
        const result: Record<string, unknown> = actions?.list
          ? await actions.list(payload.capsule)
          : await runListAction(payload.capsule, createPhase0Env(env));
        return Response.json({ ok: true, ...result });
      }
      case "detail": {
        const result: Record<string, unknown> = actions?.detail
          ? await actions.detail(payload.capsule, payload.messageId)
          : await runDetailAction(payload.capsule, payload.messageId, createPhase0Env(env));
        if ("localText" in result) {
          const { localText: _localText, ...publicResult } = result;
          return Response.json({ ok: true, ...publicResult });
        }
        return Response.json({ ok: true, ...result });
      }
      default:
        throw new EmailnatorError("UNSUPPORTED_ACTION", "Unsupported probe action.", {
          status: 400,
        });
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}
