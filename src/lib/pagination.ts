export const ADMIN_PAGE_SIZE = 8;

export function parsePageParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number(raw ?? 1);
  if (!Number.isInteger(page) || page < 1) return 1;
  return page;
}

export function getPagination(input: { page: number; totalItems: number; pageSize?: number }) {
  const pageSize = input.pageSize ?? ADMIN_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(input.totalItems / pageSize));
  const page = Math.min(Math.max(input.page, 1), totalPages);

  return {
    page,
    pageSize,
    totalItems: input.totalItems,
    totalPages,
    skip: (page - 1) * pageSize,
    hasPrevious: page > 1,
    hasNext: page < totalPages,
  };
}
