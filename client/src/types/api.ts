export interface ApiSuccess<T> {
  data: T;
}

export interface ApiErrorBody {
  error: {
    message: string;
    details?: { path: string; message: string }[];
  };
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Page<T> {
  items: T[];
  pagination: Pagination;
}
