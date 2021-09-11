import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="app-header">
        <div className="app-header__inner">
          <span className="app-header__brand">Operations Dashboard</span>
          <nav aria-label="Main">
            <ul className="app-nav">
              <li>
                <NavLink to="/" end>
                  Dashboard
                </NavLink>
              </li>
              <li>
                <NavLink to="/orders">Orders</NavLink>
              </li>
              <li>
                <NavLink to="/events">Events</NavLink>
              </li>
              {user?.role === 'ADMIN' && (
                <li>
                  <NavLink to="/users">Users</NavLink>
                </li>
              )}
            </ul>
          </nav>
          <div className="app-header__session">
            {user && (
              <span className="app-header__user">
                {user.name} <span className="role-tag">{user.role.toLowerCase()}</span>
              </span>
            )}
            <button type="button" className="button button--secondary" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </header>
      <main id="main-content" className="page" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}
