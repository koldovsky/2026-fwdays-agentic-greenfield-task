export function paginate<T>(
  list: T[],
  page: number,
  pageSize: number
): { items: T[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const safePage = Number.isFinite(page) && page >= 1 ? Math.min(page, totalPages) : 1;
  const start = (safePage - 1) * pageSize;
  return { items: list.slice(start, start + pageSize), totalPages };
}
