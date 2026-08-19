import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);

    try {
      await register(name, email, password);
      navigate('/login', {
        state: { message: 'Account created successfully. Please sign in.' },
      });
    } catch (err) {
      setError(
        getApiErrorMessage(err, 'Unable to create account. Please try again.'),
      );
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
          <h1 className="auth-card__title">Create your account</h1>
          <p className="auth-card__subtitle">Get started with project management</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Name
            </label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              disabled={submitting}
            />
          </div>

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
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="form-input"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
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
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-card__footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
