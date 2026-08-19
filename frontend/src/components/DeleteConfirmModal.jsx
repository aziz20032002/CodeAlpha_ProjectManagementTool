import { useEffect, useState } from 'react';
import Modal from './Modal';

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete this project?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Delete Project',
  submittingLabel = 'Deleting...',
  fallbackError = 'Unable to delete project.',
  children,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSubmitting(false);
      setError('');
    }
  }, [isOpen]);

  async function handleConfirm() {
    if (submitting) return;

    setError('');
    setSubmitting(true);

    try {
      await onConfirm();
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || fallbackError,
      );
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (submitting) return;
    setError('');
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <p className="modal__text">{description}</p>
      {children}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="modal-form__actions">
        <button
          type="button"
          className="btn btn--ghost"
          onClick={handleClose}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn--danger"
          onClick={handleConfirm}
          disabled={submitting}
        >
          {submitting ? submittingLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
