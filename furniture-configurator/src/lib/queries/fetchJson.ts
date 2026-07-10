export class ApiError extends Error {
  status: number;
  body: unknown;
  serverMessage: string | undefined;

  constructor(status: number, body: unknown) {
    const serverMessage =
      typeof (body as { error?: unknown } | null)?.error === "string"
        ? (body as { error: string }).error
        : undefined;
    super(serverMessage ?? "Request failed");
    this.status = status;
    this.body = body;
    this.serverMessage = serverMessage;
  }
}

export async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, json);
  }
  return json as T;
}

const NETWORK_ERROR_MESSAGE = "Помилка мережі";

export function toErrorMessage(error: unknown, actionFallback: string): string {
  if (error instanceof ApiError) {
    return error.serverMessage ?? actionFallback;
  }
  return NETWORK_ERROR_MESSAGE;
}
