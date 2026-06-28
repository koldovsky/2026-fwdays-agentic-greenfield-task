export function filterByName<T extends { name: string }>(
  list: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((p) => p.name.toLowerCase().includes(q));
}
