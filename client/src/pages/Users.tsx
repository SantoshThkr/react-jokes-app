import { useSearchParams } from 'react-router-dom';
import { fetchUsers } from '../api/usersApi';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingState } from '../components/common/LoadingState';
import { Pagination } from '../components/common/Pagination';
import { usePaginatedQuery } from '../hooks/usePaginatedQuery';
import { formatDateTime } from '../utils/format';
import { readPage, withParams } from '../utils/searchParams';

const PAGE_SIZE = 20;

export default function Users() {
  const [params, setParams] = useSearchParams();
  const page = readPage(params);
  const { page: result, loading, error, reload } = usePaginatedQuery(fetchUsers, {
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <>
      <div className="page-header">
        <h1>Users</h1>
      </div>
      <section className="panel" aria-labelledby="users-list-heading">
        <h2 id="users-list-heading" className="visually-hidden">
          User list
        </h2>
        {error && <ErrorState message={error} onRetry={reload} />}
        {!result && loading && <LoadingState label="Loading users…" />}
        {result && (
          <>
            <div className="table-wrapper">
              <table className="data-table" aria-busy={loading}>
                <caption className="visually-hidden">Users</caption>
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className="role-tag">{user.role.toLowerCase()}</span>
                      </td>
                      <td>
                        <time dateTime={user.createdAt}>{formatDateTime(user.createdAt)}</time>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              label="Users"
              pagination={result.pagination}
              onPageChange={(next) => setParams(withParams(params, { page: next }))}
            />
          </>
        )}
      </section>
    </>
  );
}
