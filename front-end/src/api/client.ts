export interface ApiErrorEnvelope {
  code: string;
  message: string;
  correlationId: string;
}

export class ApiError extends Error {
  code: string;
  correlationId: string;

  constructor(code: string, message: string, correlationId: string) {
    super(message);
    this.code = code;
    this.correlationId = correlationId;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const envelope = body as Partial<ApiErrorEnvelope> | null;
    throw new ApiError(
      envelope?.code ?? 'unknown',
      envelope?.message ?? response.statusText,
      envelope?.correlationId ?? '',
    );
  }

  return body as T;
}

export const apiClient = {
  get<T>(path: string): Promise<T> {
    return request<T>(path);
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      headers:
        body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  },
};
