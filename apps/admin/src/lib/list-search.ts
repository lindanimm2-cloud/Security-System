/** Case-insensitive substring match across stringable fields. */
export function matchesSearch(query: string, ...fields: Array<string | number | null | undefined | boolean>): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) => {
    if (field == null || field === false) return false;
    return String(field).toLowerCase().includes(q);
  });
}

export function filterBySearch<T>(
  items: T[],
  query: string,
  getFields: (item: T) => Array<string | number | null | undefined | boolean>,
): T[] {
  const q = query.trim();
  if (!q) return items;
  return items.filter((item) => matchesSearch(q, ...getFields(item)));
}
