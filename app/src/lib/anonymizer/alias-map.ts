export function buildAliasMap(names: string[]): Map<string, string> {
  const map = new Map<string, string>()
  names.forEach((name, index) => {
    map.set(name, `User${index + 1}`)
  })
  return map
}
