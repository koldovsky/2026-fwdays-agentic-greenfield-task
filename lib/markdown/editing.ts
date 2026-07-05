export type SelectionRange = { start: number; end: number };
export type EditResult = { text: string; selection: SelectionRange };

const LINE_PREFIX_PATTERN = /^(#{1,6}\s+|[-*]\s+\[[ xX]\]\s+|[-*]\s+|\d+\.\s+)/;

function lineBoundsAt(text: string, pos: number) {
  const lineStart = text.lastIndexOf("\n", pos - 1) + 1;
  const nlIndex = text.indexOf("\n", pos);
  const lineEnd = nlIndex === -1 ? text.length : nlIndex;
  return { lineStart, lineEnd };
}

function applyLinePrefix(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string
): EditResult {
  const { lineStart, lineEnd } = lineBoundsAt(text, selectionStart);
  const line = text.slice(lineStart, lineEnd);
  const stripped = line.replace(LINE_PREFIX_PATTERN, "");
  const newLine = prefix + stripped;
  const newText = text.slice(0, lineStart) + newLine + text.slice(lineEnd);
  const delta = newLine.length - line.length;

  return {
    text: newText,
    selection: { start: selectionStart + delta, end: selectionEnd + delta },
  };
}

export function applyHeading(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  level: 1 | 2
): EditResult {
  return applyLinePrefix(text, selectionStart, selectionEnd, level === 1 ? "# " : "## ");
}

export function applyListPrefix(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string
): EditResult {
  return applyLinePrefix(text, selectionStart, selectionEnd, prefix);
}

export function applyCodeFormatting(
  text: string,
  selectionStart: number,
  selectionEnd: number
): EditResult {
  const selected = text.slice(selectionStart, selectionEnd);
  const isMultiline = selected.includes("\n");

  if (selected.length > 0 && !isMultiline) {
    const newText =
      text.slice(0, selectionStart) + "`" + selected + "`" + text.slice(selectionEnd);
    return {
      text: newText,
      selection: { start: selectionStart + 1, end: selectionEnd + 1 },
    };
  }

  const block = "```\n" + selected + "\n```";
  const newText = text.slice(0, selectionStart) + block + text.slice(selectionEnd);
  const cursor = selectionStart + 4; // after "```\n"
  return {
    text: newText,
    selection: { start: cursor, end: cursor + selected.length },
  };
}
