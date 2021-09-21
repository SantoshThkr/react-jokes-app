import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../api/client';
import type { Page } from '../types/api';

interface QueryResult<T> {
  /** The request this result belongs to. */
  key: string;
  page: Page<T> | null;
  error: string | null;
}

/**
 * Loads one server-side page for `query`. Previous results stay visible while
 * the next page loads, and responses for outdated queries are ignored.
 * `fetcher` must be stable (e.g. a module-level API function).
 */
export function usePaginatedQuery<T, Q extends object>(
  fetcher: (query: Q) => Promise<Page<T>>,
  query: Q,
) {
  const [reloadCount, setReloadCount] = useState(0);
  const queryKey = JSON.stringify(query);
  const requestKey = `${queryKey}#${reloadCount}`;
  const [result, setResult] = useState<QueryResult<T>>({ key: '', page: null, error: null });

  useEffect(() => {
    let cancelled = false;
    fetcher(JSON.parse(queryKey) as Q)
      .then((page) => {
        if (!cancelled) setResult({ key: requestKey, page, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setResult((previous) => ({ ...previous, key: requestKey, error: getErrorMessage(error) }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher, queryKey, requestKey]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  /** Patch loaded items in place, e.g. when a live update arrives. */
  const updateItems = useCallback((update: (items: T[]) => T[]) => {
    setResult((previous) =>
      previous.page ? { ...previous, page: { ...previous.page, items: update(previous.page.items) } } : previous,
    );
  }, []);

  /** Insert a newly created item at the top of the current page (newest-first lists). */
  const prependItem = useCallback((item: T, getId: (item: T) => string | number) => {
    setResult((previous) => {
      if (!previous.page) return previous;
      const { items, pagination } = previous.page;
      if (items.some((existing) => getId(existing) === getId(item))) return previous;
      const total = pagination.total + 1;
      return {
        ...previous,
        page: {
          items: [item, ...items].slice(0, pagination.pageSize),
          pagination: { ...pagination, total, totalPages: Math.ceil(total / pagination.pageSize) },
        },
      };
    });
  }, []);

  return {
    page: result.page,
    error: result.key === requestKey ? result.error : null,
    loading: result.key !== requestKey,
    reload,
    updateItems,
    prependItem,
  };
}
