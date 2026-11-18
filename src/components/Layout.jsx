import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, hasRole, logout } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className={`app-shell ${hasRole('ADMIN') ? 'admin-shell' : 'customer-shell'}`}>
      <header className="top-bar">
        <div className="container d-flex align-items-center justify-content-between py-3">
          <Link to="/dashboard" className="brand">SmartPay <small>DEMO</small></Link>
          <nav className="d-flex align-items-center gap-3 flex-wrap">
            <NavLink to="/dashboard" end>Dashboard</NavLink>
            <NavLink to="/send">Send money</NavLink>
            <NavLink to="/transactions">History</NavLink>
            {hasRole('ADMIN') && <NavLink to="/admin">Admin review</NavLink>}
            {hasRole('ADMIN') && <NavLink to="/admin/alerts">Alerts</NavLink>}
            {user && <span className="text-muted small">{user.email}</span>}
            {user && <button className="btn btn-outline-secondary btn-sm" onClick={onLogout}>Log out</button>}
          </nav>
        </div>
      </header>
      <main className="container py-4">
        <div className="simulation-banner">
          Simulation only — no real money, bank account, card, or credentials are used.
        </div>
        <Outlet />
      </main>
    </div>
  );
}
