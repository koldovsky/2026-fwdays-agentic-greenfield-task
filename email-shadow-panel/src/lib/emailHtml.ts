import type { VerificationLink } from "./verificationActions.ts";
import { extractSafeLinks } from "./verificationActions.ts";

export interface SanitizedEmailHtml {
  html: string;
  hasUsableContent: boolean;
  hasBlockedRemoteImages: boolean;
  blockedImageCount: number;
  links: VerificationLink[];
}

const REMOVABLE_TAGS = new Set([
  "script",
  "style",
  "link",
  "meta",
  "base",
  "iframe",
  "frame",
  "frameset",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "select",
  "option",
  "textarea",
  "canvas",
  "svg",
  "math",
  "video",
  "audio",
  "source",
  "track",
  "applet",
  "portal",
  "template",
  "noscript",
]);

const ALLOWED_TAGS = new Set([
  "a",
  "abbr",
  "article",
  "aside",
  "b",
  "blockquote",
  "br",
  "caption",
  "center",
  "code",
  "col",
  "colgroup",
  "dd",
  "del",
  "details",
  "div",
  "dl",
  "dt",
  "em",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "i",
  "img",
  "ins",
  "li",
  "main",
  "ol",
  "p",
  "pre",
  "section",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);

const SELF_CONTAINED_IMAGE_PATTERN = /^(?:cid:|blob:)/iu;
const UNSAFE_PROTOCOL_PATTERN = /^(?:javascript|data|vbscript|file):/iu;
const HTML_COMMENT_PATTERN = /<!--[\s\S]*?-->/gu;
const REMOVABLE_BLOCK_PATTERN =
  /<(script|style|iframe|object|embed|form|svg|math|template|noscript|button|select|textarea|canvas|video|audio|source|track|applet|portal)[^>]*>[\s\S]*?<\/\1>/giu;
const REMOVABLE_VOID_PATTERN = /<(?:link|meta|base|input)[^>]*>/giu;
const EVENT_HANDLER_PATTERN = /\s+on[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu;
const STYLE_ATTR_PATTERN = /\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu;
const JS_HREF_PATTERN =
  /\s+(href|src|srcset|poster)\s*=\s*("|')\s*(?:javascript|data|vbscript|file):[\s\S]*?\2/giu;
const TAG_PATTERN = /<\/?([a-z0-9:-]+)([^>]*)>/giu;
const ATTR_PATTERN = /([a-z0-9:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/giu;
const NUMERIC_ATTR_PATTERN = /^\d{1,4}$/u;

function stripVisibleText(html: string): string {
  return html
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<\/p>/giu, "\n")
    .replace(/<[^>]+>/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function toSafeExternalUrl(value: string | null | undefined): URL | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || UNSAFE_PROTOCOL_PATTERN.test(trimmed)) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function unwrapElement(element: Element) {
  const parent = element.parentNode;
  if (!parent) {
    return;
  }

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }

  parent.removeChild(element);
}

function isTinyImage(width: string, height: string): boolean {
  const parsedWidth = Number.parseInt(width, 10);
  const parsedHeight = Number.parseInt(height, 10);
  return (
    Number.isFinite(parsedWidth) &&
    Number.isFinite(parsedHeight) &&
    parsedWidth <= 2 &&
    parsedHeight <= 2
  );
}

function buildBlockedImagePlaceholder(
  documentRef: Document,
  url: URL,
  alt: string,
  width: string,
  height: string,
): HTMLElement {
  const figure = documentRef.createElement("figure");
  figure.setAttribute("class", "esp-email-image-blocked");
  figure.setAttribute("data-esp-image-domain", url.hostname);
  if (NUMERIC_ATTR_PATTERN.test(width)) figure.setAttribute("data-esp-image-width", width);
  if (NUMERIC_ATTR_PATTERN.test(height)) figure.setAttribute("data-esp-image-height", height);
  if (isTinyImage(width, height)) figure.setAttribute("data-esp-image-tiny", "true");

  const label = documentRef.createElement("figcaption");
  label.textContent = alt
    ? `${alt} (remote image blocked from ${url.hostname})`
    : `Remote image blocked from ${url.hostname}`;
  figure.append(label);

  return figure;
}

function sanitizeWithDomParser(
  html: string,
  allowRemoteImages: boolean,
): SanitizedEmailHtml | null {
  if (typeof DOMParser === "undefined") {
    return null;
  }

  try {
    const parser = new DOMParser();
    const documentRef = parser.parseFromString(html, "text/html");
    const body = documentRef.body;
    if (!body) {
      return null;
    }

    for (const node of Array.from(body.querySelectorAll("*"))) {
      const tagName = node.tagName.toLowerCase();
      const originalAttributes = new Map(
        Array.from(node.attributes, (attribute) => [attribute.name.toLowerCase(), attribute.value]),
      );

      if (REMOVABLE_TAGS.has(tagName)) {
        node.remove();
        continue;
      }

      if (!ALLOWED_TAGS.has(tagName)) {
        unwrapElement(node);
        continue;
      }

      for (const attribute of Array.from(node.attributes)) {
        node.removeAttribute(attribute.name);
      }

      if (tagName === "a") {
        const href = originalAttributes.get("href");
        const safeUrl = toSafeExternalUrl(href);
        const fallbackUrl = toSafeExternalUrl(node.textContent);
        const finalUrl = safeUrl ?? fallbackUrl;

        if (!finalUrl) {
          unwrapElement(node);
          continue;
        }

        node.setAttribute("href", finalUrl.toString());
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noreferrer noopener");
        node.setAttribute("data-esp-link-domain", finalUrl.hostname);
        continue;
      }

      if (tagName === "img") {
        const image = node as HTMLImageElement;
        const src = originalAttributes.get("src") ?? "";
        const safeUrl = toSafeExternalUrl(src);
        const alt = originalAttributes.get("alt")?.trim() ?? "Email image";
        const width = originalAttributes.get("width") ?? "";
        const height = originalAttributes.get("height") ?? "";

        if (safeUrl) {
          if (allowRemoteImages) {
            image.setAttribute("src", safeUrl.toString());
            image.setAttribute("alt", alt);
            image.setAttribute("loading", "lazy");
            image.setAttribute("referrerpolicy", "no-referrer");
            if (NUMERIC_ATTR_PATTERN.test(width)) image.setAttribute("width", width);
            if (NUMERIC_ATTR_PATTERN.test(height)) image.setAttribute("height", height);
          } else {
            const placeholder = buildBlockedImagePlaceholder(
              documentRef,
              safeUrl,
              alt,
              width,
              height,
            );
            image.replaceWith(placeholder);
          }
          continue;
        }

        if (SELF_CONTAINED_IMAGE_PATTERN.test(src.trim())) {
          image.remove();
          continue;
        }

        image.remove();
        continue;
      }

      if (tagName === "table") {
        const width = originalAttributes.get("width") ?? "";
        if (NUMERIC_ATTR_PATTERN.test(width)) {
          node.setAttribute("width", width);
        }
        continue;
      }

      if (tagName === "td" || tagName === "th") {
        const colspan = originalAttributes.get("colspan") ?? "";
        const rowspan = originalAttributes.get("rowspan") ?? "";
        if (NUMERIC_ATTR_PATTERN.test(colspan)) {
          node.setAttribute("colspan", colspan);
        }
        if (NUMERIC_ATTR_PATTERN.test(rowspan)) {
          node.setAttribute("rowspan", rowspan);
        }
      }
    }

    const sanitizedHtml = body.innerHTML.trim();
    return {
      html: sanitizedHtml,
      hasUsableContent:
        stripVisibleText(sanitizedHtml).length > 0 ||
        /<(?:img|table|hr|br|figure)\b/iu.test(sanitizedHtml),
      hasBlockedRemoteImages: !allowRemoteImages && /esp-email-image-blocked/u.test(sanitizedHtml),
      blockedImageCount: allowRemoteImages
        ? 0
        : (sanitizedHtml.match(/esp-email-image-blocked/gu) ?? []).length,
      links: extractSafeLinks(sanitizedHtml),
    };
  } catch {
    return null;
  }
}

function sanitizeWithFallback(html: string, allowRemoteImages: boolean): SanitizedEmailHtml {
  let sanitized = html
    .replace(HTML_COMMENT_PATTERN, " ")
    .replace(REMOVABLE_BLOCK_PATTERN, " ")
    .replace(REMOVABLE_VOID_PATTERN, " ")
    .replace(EVENT_HANDLER_PATTERN, "")
    .replace(STYLE_ATTR_PATTERN, "")
    .replace(JS_HREF_PATTERN, "");

  let blockedImageCount = 0;

  sanitized = sanitized.replace(/<img\b([^>]*)>/giu, (_match, rawAttributes: string) => {
    ATTR_PATTERN.lastIndex = 0;
    let srcValue: string | null = null;
    let altValue = "Email image";
    let widthValue: string | null = null;
    let heightValue: string | null = null;

    for (const attributeMatch of rawAttributes.matchAll(ATTR_PATTERN)) {
      const name = (attributeMatch[1] ?? "").toLowerCase();
      const value = attributeMatch[3] ?? attributeMatch[4] ?? attributeMatch[5] ?? "";

      if (name === "src") srcValue = value;
      if (name === "alt") altValue = value.trim() || altValue;
      if (name === "width" && NUMERIC_ATTR_PATTERN.test(value)) widthValue = value;
      if (name === "height" && NUMERIC_ATTR_PATTERN.test(value)) heightValue = value;
    }

    const safeUrl = toSafeExternalUrl(srcValue);
    if (safeUrl) {
      if (allowRemoteImages) {
        const dimensions = [
          widthValue ? ` width="${widthValue}"` : "",
          heightValue ? ` height="${heightValue}"` : "",
        ].join("");
        return `<img src="${safeUrl.toString()}" alt="${altValue.replace(/"/gu, "&quot;")}" loading="lazy" referrerpolicy="no-referrer"${dimensions}>`;
      }

      blockedImageCount += 1;
      return `<figure class="esp-email-image-blocked" data-esp-image-domain="${safeUrl.hostname}"${widthValue ? ` data-esp-image-width="${widthValue}"` : ""}${heightValue ? ` data-esp-image-height="${heightValue}"` : ""}${isTinyImage(widthValue ?? "", heightValue ?? "") ? ' data-esp-image-tiny="true"' : ""}><figcaption>${altValue.replace(/</gu, "&lt;").replace(/>/gu, "&gt;")} (remote image blocked from ${safeUrl.hostname})</figcaption></figure>`;
    }

    return "";
  });

  sanitized = sanitized.replace(
    TAG_PATTERN,
    (fullMatch, rawTagName: string, rawAttributes: string) => {
      const tagName = rawTagName.toLowerCase();
      const isClosingTag = fullMatch.startsWith("</");

      if (REMOVABLE_TAGS.has(tagName)) {
        return "";
      }

      if (!ALLOWED_TAGS.has(tagName)) {
        return "";
      }

      if (isClosingTag) {
        return `</${tagName}>`;
      }

      if (tagName === "a") {
        ATTR_PATTERN.lastIndex = 0;
        let hrefValue: string | null = null;
        for (const attributeMatch of rawAttributes.matchAll(ATTR_PATTERN)) {
          const name = (attributeMatch[1] ?? "").toLowerCase();
          const value = attributeMatch[3] ?? attributeMatch[4] ?? attributeMatch[5] ?? "";
          if (name === "href") {
            hrefValue = value;
          }
        }

        const safeUrl = toSafeExternalUrl(hrefValue);
        if (!safeUrl) {
          return "<a>";
        }

        return `<a href="${safeUrl.toString()}" target="_blank" rel="noreferrer noopener" data-esp-link-domain="${safeUrl.hostname}">`;
      }

      if (tagName === "img") {
        return fullMatch;
      }

      if (tagName === "table" || tagName === "td" || tagName === "th") {
        ATTR_PATTERN.lastIndex = 0;
        const safeAttributes: string[] = [];
        for (const attributeMatch of rawAttributes.matchAll(ATTR_PATTERN)) {
          const name = (attributeMatch[1] ?? "").toLowerCase();
          const value = attributeMatch[3] ?? attributeMatch[4] ?? attributeMatch[5] ?? "";
          if (
            ["width", "height", "colspan", "rowspan"].includes(name) &&
            NUMERIC_ATTR_PATTERN.test(value)
          ) {
            safeAttributes.push(`${name}="${value}"`);
          }
        }

        return safeAttributes.length > 0
          ? `<${tagName} ${safeAttributes.join(" ")}>`
          : `<${tagName}>`;
      }

      return `<${tagName}>`;
    },
  );

  const normalizedHtml = sanitized.trim();
  return {
    html: normalizedHtml,
    hasUsableContent:
      stripVisibleText(normalizedHtml).length > 0 ||
      /<(?:img|table|hr|br|figure)\b/iu.test(normalizedHtml),
    hasBlockedRemoteImages: blockedImageCount > 0,
    blockedImageCount,
    links: extractSafeLinks(normalizedHtml),
  };
}

export function sanitizeEmailHtml(
  html: string,
  options?: { allowRemoteImages?: boolean },
): SanitizedEmailHtml {
  const allowRemoteImages = options?.allowRemoteImages ?? false;
  try {
    return (
      sanitizeWithDomParser(html, allowRemoteImages) ??
      sanitizeWithFallback(html, allowRemoteImages)
    );
  } catch {
    try {
      return sanitizeWithFallback(html, allowRemoteImages);
    } catch {
      return {
        html: "",
        hasUsableContent: false,
        hasBlockedRemoteImages: false,
        blockedImageCount: 0,
        links: [],
      };
    }
  }
}
