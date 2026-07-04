import sanitizeHtml from "sanitize-html";
import {
  MARKDOWN_ALLOWED_TAGS,
  MARKDOWN_ALLOWED_ATTRIBUTES,
} from "@/lib/markdown/allowlist";

export function sanitizeServerHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: MARKDOWN_ALLOWED_TAGS,
    allowedAttributes: MARKDOWN_ALLOWED_ATTRIBUTES,
  });
}
