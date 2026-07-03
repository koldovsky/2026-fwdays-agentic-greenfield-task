// Shared client-side NDJSON reader for the tailoring routes (FR-TAILOR-01/02).
// POSTs a JSON body, then decodes the response stream and re-yields one parsed
// event per line so the UI can `for await` the same events the route produces.
// A non-ok response or a missing body never throws to the caller — it degrades
// to a single calm `fallback` event (NFR-OBS-01); a malformed line still throws
// (JSON.parse), which the UI layer is responsible for catching. Every tailoring
// event union (TailorRunEvent, AnalysisEvent, GenerationEvent) carries an
// `{ type: "error"; code }` member, so each caller passes its own typed
// `{ type: "error", code: "failed" }` as the fallback.
export async function* readNdjson<T>(
  url: string,
  body: unknown,
  fallback: T,
): AsyncGenerator<T, void, void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok || response.body === null) {
    yield fallback;
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
      yield JSON.parse(line) as T;
    }
  }

  if (buffer.trim() !== "") {
    yield JSON.parse(buffer) as T;
  }
}
