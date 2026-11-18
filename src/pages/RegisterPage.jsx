import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErrorMessage } from '../components/Feedback';

const EMPTY = { email: '', password: '', fullName: '', phone: '' };

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-8 col-lg-6">
        <div className="card shadow-sm">
          <div className="card-body">
            <h1 className="h4 mb-3">Create a simulated wallet</h1>
            <ErrorMessage message={error} />
            <form onSubmit={onSubmit}>
              {Object.keys(EMPTY).map((field) => (
                <div className="mb-3" key={field}>
                  <label className="form-label" htmlFor={field}>
                    {field.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
                  </label>
                  <input id={field} className="form-control" required
                    type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })} />
                </div>
              ))}
              <button className="btn btn-primary w-100" disabled={busy}>
                {busy ? 'Creating…' : 'Create account'}
              </button>
            </form>
            <p className="mt-3 small text-muted">
              Already registered? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
