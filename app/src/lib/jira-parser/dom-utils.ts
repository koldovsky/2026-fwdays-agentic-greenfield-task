export function textOf(el: Element | null): string | undefined {
  const text = el?.textContent?.trim()
  return text ? text : undefined
}

export function queryText(root: ParentNode, selector: string): string | undefined {
  return textOf(root.querySelector(selector))
}
