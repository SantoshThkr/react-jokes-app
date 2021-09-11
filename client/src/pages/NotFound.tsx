import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="page">
      <h1>Page not found</h1>
      <p>
        The page you requested does not exist. <Link to="/">Go to the dashboard</Link>.
      </p>
    </main>
  );
}
