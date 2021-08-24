import type { PaginationInput } from '../validators/commonValidators';

export interface Page<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const toSkipTake = ({ page, pageSize }: PaginationInput) => ({
  skip: (page - 1) * pageSize,
  take: pageSize,
});

export function buildPage<T>(items: T[], total: number, { page, pageSize }: PaginationInput): Page<T> {
  return {
    items,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}
