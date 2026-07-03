// Client-side NDJSON reader for POST /api/tailor (FR-TAILOR-01/02). Decodes the
// response body stream and re-yields one TailorRunEvent per line, so the UI can
// `for await` the same events the route produces. A non-ok response or a
// missing body never throws to the caller — it degrades to a single calm
// `failed` event (NFR-OBS-01); a malformed line still throws (JSON.parse),
// which the UI layer is responsible for catching.
import type { TailorRunEvent, TailoringRunInput } from "../model/types";

export async function* streamTailoring(
  input: TailoringRunInput,
): AsyncGenerator<TailorRunEvent, void, void> {
  const response = await fetch("/api/tailor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok || response.body === null) {
    yield { type: "error", code: "failed" };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim() === "") continue;
      yield JSON.parse(line) as TailorRunEvent;
    }
  }

  if (buffer.trim() !== "") {
    yield JSON.parse(buffer) as TailorRunEvent;
  }
}
