import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function readFixture(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), "tests/fixtures/emailnator", relativePath), "utf8");
}

export function jsonFixture<T>(relativePath: string): T {
  return JSON.parse(readFixture(relativePath)) as T;
}

export function responseFromFixture(options: {
  body: string;
  status?: number;
  headers?: Record<string, string | string[]>;
}): Response {
  const headers = new Headers();
  for (const [name, value] of Object.entries(options.headers ?? {})) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        headers.append(name, entry);
      }
      continue;
    }
    headers.set(name, value);
  }

  return new Response(options.body, {
    status: options.status ?? 200,
    headers,
  });
}
