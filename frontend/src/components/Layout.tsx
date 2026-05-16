import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

export default function Layout() {
  const { address, logout } = useAuthStore();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        background: 'var(--c-surface)',
        borderBottom: '1px solid var(--c-border)',
        padding: '0.75rem 1rem',
      }}>
        <div className="container row">
          <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--c-primary)' }}>
            ◎ CERCLE
          </span>
          <span className="spacer" />
          <span className="muted" style={{ fontSize: '0.75rem' }}>
            {address?.slice(0, 6)}…{address?.slice(-4)}
          </span>
          <button className="ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main style={{ flex: 1, padding: '1.5rem 0' }}>
        <div className="container">
          <Outlet />
        </div>
      </main>

      <nav style={{
        background: 'var(--c-surface)',
        borderTop: '1px solid var(--c-border)',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '0.75rem 0',
      }}>
        {[
          { to: '/', label: '🏠 Home' },
          { to: '/circles/new', label: '➕ New' },
          { to: '/reputation', label: '⭐ Rep' },
        ].map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end
            style={({ isActive }) => ({
              color: isActive ? 'var(--c-primary)' : 'var(--c-muted)',
              fontSize: '0.8rem',
              fontWeight: 600,
            })}
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
