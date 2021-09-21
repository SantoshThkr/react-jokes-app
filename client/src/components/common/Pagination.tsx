import type { Pagination as PaginationInfo } from '../../types/api';
import { formatNumber } from '../../utils/format';

interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  label: string;
}

export function Pagination({ pagination, onPageChange, label }: PaginationProps) {
  const { page, pageSize, total, totalPages } = pagination;
  if (total === 0) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav className="pagination" aria-label={`${label} pagination`}>
      <p className="pagination__summary">
        Showing {formatNumber(first)}–{formatNumber(last)} of {formatNumber(total)}
      </p>
      <div className="pagination__controls">
        <button
          type="button"
          className="button button--secondary"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </button>
        <span aria-current="page">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
