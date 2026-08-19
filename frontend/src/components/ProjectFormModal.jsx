import { useEffect, useState } from 'react';
import Modal from './Modal';

export default function ProjectFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialValues = { name: '', description: '' },
  title,
  submitLabel,
  submittingLabel,
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialValues.name || '');
      setDescription(initialValues.description || '');
      setError('');
      setSubmitting(false);
    }
  }, [isOpen, initialValues.name, initialValues.description]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Project name is required.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await onSubmit({
        name: trimmedName,
        description: description.trim() || null,
      });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to save project.',
      );
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="project-name" className="form-label">
            Project Name
          </label>
          <input
            id="project-name"
            type="text"
            className="form-input"
            placeholder="Enter project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="project-description" className="form-label">
            Description
          </label>
          <textarea
            id="project-description"
            className="form-textarea"
            placeholder="Optional project description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            rows={4}
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
            {submitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
