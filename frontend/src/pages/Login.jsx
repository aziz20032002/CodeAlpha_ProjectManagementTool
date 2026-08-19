import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';

export default function Login() {
  const { login } = useAuth();
  const location = useLocation();
  const successMessage = location.state?.message;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to sign in. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page page--fade-in">
      <div className="auth-card">
        <div className="auth-card__brand">
          <div className="auth-card__logo">CA</div>
          <div className="auth-card__product">
            <span>CodeAlpha</span>
            <small>Project Management</small>
          </div>
          <h1 className="auth-card__title">Welcome back</h1>
          <p className="auth-card__subtitle">Sign in to your account to continue</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {successMessage && (
            <p className="form-success" role="status">
              {successMessage}
            </p>
          )}

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={submitting}
            />
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn--primary btn--full"
            disabled={submitting}
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-card__footer">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="auth-link">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
