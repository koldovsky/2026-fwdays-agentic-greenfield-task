import { z } from "zod";

import { DomainError } from "./errors.server.ts";

export type UpstashRedisCommand = readonly [string, ...string[]];

const restResponseSchema = z.object({
  result: z.unknown().optional(),
  error: z.string().optional(),
});

const restPipelineResponseSchema = z.array(restResponseSchema);

export interface UpstashRedisClient {
  command<TResult = unknown>(command: UpstashRedisCommand): Promise<TResult>;
  pipeline<TResult = unknown>(commands: UpstashRedisCommand[]): Promise<TResult[]>;
}

export interface UpstashRedisRestClientConfig {
  url: string;
  token: string;
}

export function createUpstashRedisRestClient(
  config: UpstashRedisRestClientConfig,
  runtime?: { fetchImpl?: typeof fetch },
): UpstashRedisClient {
  const fetchImpl = runtime?.fetchImpl ?? fetch;
  const baseUrl = config.url.replace(/\/+$/u, "");

  async function request<TResult>(path: string, body: unknown): Promise<TResult> {
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new DomainError("PERSISTENCE_UNAVAILABLE", "The Upstash request failed.", {
        cause: error,
        safeMessage: "Temporary session storage is unavailable.",
      });
    }

    if (!response.ok) {
      throw new DomainError(
        "PERSISTENCE_UNAVAILABLE",
        `The Upstash request returned HTTP ${response.status}.`,
        {
          safeMessage: "Temporary session storage is unavailable.",
        },
      );
    }

    const payload = await response.json();
    const parsed = restResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new DomainError(
        "PERSISTENCE_UNAVAILABLE",
        "The Upstash response could not be parsed.",
        {
          safeMessage: "Temporary session storage is unavailable.",
        },
      );
    }

    if (parsed.data.error) {
      throw new DomainError("PERSISTENCE_UNAVAILABLE", "The Upstash response contained an error.", {
        details: { error: parsed.data.error },
        safeMessage: "Temporary session storage is unavailable.",
      });
    }

    return parsed.data.result as TResult;
  }

  return {
    command<TResult = unknown>(command: UpstashRedisCommand) {
      return request<TResult>("", command);
    },
    async pipeline<TResult = unknown>(commands: UpstashRedisCommand[]) {
      const response = await fetchImpl(`${baseUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commands),
      }).catch((error) => {
        throw new DomainError("PERSISTENCE_UNAVAILABLE", "The Upstash pipeline request failed.", {
          cause: error,
          safeMessage: "Temporary session storage is unavailable.",
        });
      });

      if (!response.ok) {
        throw new DomainError(
          "PERSISTENCE_UNAVAILABLE",
          `The Upstash pipeline returned HTTP ${response.status}.`,
          {
            safeMessage: "Temporary session storage is unavailable.",
          },
        );
      }

      const payload = await response.json();
      const parsed = restPipelineResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new DomainError(
          "PERSISTENCE_UNAVAILABLE",
          "The Upstash pipeline response could not be parsed.",
          {
            safeMessage: "Temporary session storage is unavailable.",
          },
        );
      }

      for (const item of parsed.data) {
        if (item.error) {
          throw new DomainError(
            "PERSISTENCE_UNAVAILABLE",
            "The Upstash pipeline returned an error.",
            {
              details: { error: item.error },
              safeMessage: "Temporary session storage is unavailable.",
            },
          );
        }
      }

      return parsed.data.map((item) => item.result as TResult);
    },
  };
}
