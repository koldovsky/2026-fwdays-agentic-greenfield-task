export const MARKDOWN_ALLOWED_TAGS = [
  "h1",
  "h2",
  "p",
  "br",
  "ul",
  "ol",
  "li",
  "code",
  "pre",
  "input",
];

export const MARKDOWN_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  input: ["type", "disabled", "checked"],
};
