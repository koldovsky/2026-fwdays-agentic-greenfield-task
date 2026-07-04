import DOMPurify from "dompurify";
import {
  MARKDOWN_ALLOWED_TAGS,
  MARKDOWN_ALLOWED_ATTRIBUTES,
} from "@/lib/markdown/allowlist";

const ALLOWED_ATTR = Array.from(
  new Set(Object.values(MARKDOWN_ALLOWED_ATTRIBUTES).flat())
);

export function sanitizeClientHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: MARKDOWN_ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}
