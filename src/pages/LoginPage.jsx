import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErrorMessage } from '../components/Feedback';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-mark" aria-hidden="true">◈</div>
        <div className="auth-kicker">SmartPay · Simulation</div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">
          Sign in to explore the simulated wallet and fraud-detection workspace.
        </p>

        <ErrorMessage message={error} />

        <form onSubmit={onSubmit} className="auth-form">
          <div className="mb-3 text-start">
            <label className="form-label" htmlFor="email">Email or demo username</label>
            <input id="email" type="text" className="form-control" required
              autoComplete="username"
              placeholder="you@example.com or admin"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="mb-4 text-start">
            <label className="form-label" htmlFor="password">Password</label>
            <input id="password" type="password" className="form-control" required
              autoComplete="current-password"
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button className="btn btn-primary w-100 auth-submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="auth-footer">
          New here? <Link to="/register">Create a simulated customer account</Link>
        </div>
      </div>
    </div>
  );
}
