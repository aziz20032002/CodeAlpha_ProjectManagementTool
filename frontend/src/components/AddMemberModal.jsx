import { useEffect, useState } from 'react';
import Modal from './Modal';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AddMemberModal({ isOpen, onClose, onSubmit }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setError('');
      setSubmitting(false);
    }
  }, [isOpen]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Email is required.');
      return;
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await onSubmit(trimmedEmail.toLowerCase());
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to add member.'));
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Team Member">
      <p className="modal__text">
        Add an existing user to this project by email.
      </p>

      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="member-email" className="form-label">
            Email Address
          </label>
          <input
            id="member-email"
            type="email"
            className="form-input"
            placeholder="member@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            autoComplete="email"
          />
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="modal-form__actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Adding...' : 'Add Member'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
