import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  per_page: number = 20;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export function paginate<T>(data: T[], total: number, page: number, perPage: number): PaginatedResult<T> {
  return {
    data,
    meta: {
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
    },
  };
}

export function withPagination<T>(
  query: { page?: number; per_page?: number },
  defaultPage = 1,
  defaultPerPage = 20,
) {
  const page = Math.max(1, Number(query.page) || defaultPage);
  const perPage = Math.min(100, Math.max(1, Number(query.per_page) || defaultPerPage));
  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}