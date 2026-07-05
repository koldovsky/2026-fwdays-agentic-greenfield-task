import { renderMarkdown } from "@/lib/markdown/render";
import { sanitizeServerHtml } from "@/lib/markdown/sanitize.server";

const SNIPPET_LENGTH = 160;

// Truncates the raw Markdown (not the rendered HTML) so sanitize-html never has to
// deal with a source string cut mid-tag; used for card previews across notes/folders/
// tags/search/trash, all Server Components, so the Node-native sanitizer is safe here.
export function renderSnippetHtml(content: string): string {
  const trimmed = content.trim();
  const truncated =
    trimmed.length > SNIPPET_LENGTH ? `${trimmed.slice(0, SNIPPET_LENGTH)}…` : trimmed;
  return sanitizeServerHtml(renderMarkdown(truncated));
}
