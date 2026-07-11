/**
 * Phase 1 plan 04 — provider-models endpoint helpers (BACK-03 + BACK-05).
 *
 * Asserts:
 *  - `loadOllamaProviderModels(baseUrl)` POSTs `{base_url}` to
 *    `/providers/ollama/models` and returns the response.
 *  - `loadOpenAIProviderModels(baseUrl, apiKey)` POSTs
 *    `{base_url, api_key}` to `/providers/openai-compatible/models`
 *    and returns the response.
 *  - A 502 `provider_unreachable` error envelope propagates via the
 *    thrown axios error (the SPA's `ErrorBlock` reads
 *    `error.code === "provider_unreachable"` to render the inline
 *    notice).
 *
 * The `api.get` / `api.post` calls are spied via `vi.spyOn` (the
 * project already uses `vi` in `tests/unit/*`).
 *
 * The `api.test.ts` filename is the canonical SPA unit-test
 * location for the `lib/api.ts` helpers. The plan's reference to
 * "existing `loadProviderModels` test cases" describes a prior
 * state of this file that did not exist in the v1.1 baseline; the
 * 4 new tests land in this new file.
 */
import { AxiosError } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api, loadOllamaProviderModels, loadOpenAIProviderModels } from "@/lib/api";

describe("loadOllamaProviderModels helper", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POSTs {base_url} to /providers/ollama/models on the shared axios instance", async () => {
    const spy = vi.spyOn(api, "post").mockResolvedValue({
      data: {
        models: [
          { name: "translategemma:12b" },
          { name: "translategemma:27b" },
          { name: "llama3.1:8b" },
        ],
      },
    } as never);
    const result = await loadOllamaProviderModels("http://localhost:11434");
    expect(spy).toHaveBeenCalledWith("/providers/ollama/models", {
      base_url: "http://localhost:11434",
    });
    expect(result.models).toHaveLength(3);
    expect(result.models[0].name).toBe("translategemma:12b");
  });

  it("maps a 502 provider_unreachable error envelope to the thrown axios error", async () => {
    const axiosError = new AxiosError(
      "Request failed with status code 502",
      "502",
      undefined,
      undefined,
      {
        status: 502,
        data: {
          error: {
            code: "provider_unreachable",
            message: "Connection refused: http://unreachable:11434",
            details: { provider_error: "Connection refused" },
          },
        },
      } as never,
    );
    vi.spyOn(api, "post").mockRejectedValue(axiosError);

    await expect(loadOllamaProviderModels("http://unreachable:11434")).rejects.toBeInstanceOf(
      AxiosError,
    );

    try {
      await loadOllamaProviderModels("http://unreachable:11434");
    } catch (err) {
      const ax = err as AxiosError;
      expect(ax.response?.status).toBe(502);
      const body = ax.response?.data as {
        error: { code: string; message: string; details: { provider_error: string } };
      };
      expect(body.error.code).toBe("provider_unreachable");
      expect(body.error.details.provider_error).toContain("Connection refused");
    }
  });
});

describe("loadOpenAIProviderModels helper", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POSTs {base_url, api_key} to /providers/openai-compatible/models on the shared axios instance", async () => {
    const spy = vi.spyOn(api, "post").mockResolvedValue({
      data: {
        models: [
          { id: "gpt-4o-mini", object: "model", created: 1700000000, owned_by: "openai" },
          { id: "gpt-4o", object: "model", created: 1700000000, owned_by: "openai" },
        ],
      },
    } as never);
    const result = await loadOpenAIProviderModels("https://api.openai.com/v1", "sk-test-fake-key");
    expect(spy).toHaveBeenCalledWith("/providers/openai-compatible/models", {
      base_url: "https://api.openai.com/v1",
      api_key: "sk-test-fake-key",
    });
    expect(result.models).toHaveLength(2);
    expect(result.models[0].id).toBe("gpt-4o-mini");
  });

  it("maps a 502 provider_unreachable error envelope to the thrown axios error", async () => {
    const axiosError = new AxiosError(
      "Request failed with status code 502",
      "502",
      undefined,
      undefined,
      {
        status: 502,
        data: {
          error: {
            code: "provider_unreachable",
            message: "Connection refused: https://unreachable.example/v1",
            details: { provider_error: "Connection refused" },
          },
        },
      } as never,
    );
    vi.spyOn(api, "post").mockRejectedValue(axiosError);

    await expect(
      loadOpenAIProviderModels("https://unreachable.example/v1", "sk-test"),
    ).rejects.toBeInstanceOf(AxiosError);

    try {
      await loadOpenAIProviderModels("https://unreachable.example/v1", "sk-test");
    } catch (err) {
      const ax = err as AxiosError;
      expect(ax.response?.status).toBe(502);
      const body = ax.response?.data as {
        error: { code: string; message: string; details: { provider_error: string } };
      };
      expect(body.error.code).toBe("provider_unreachable");
      expect(body.error.details.provider_error).toContain("Connection refused");
    }
  });
});
