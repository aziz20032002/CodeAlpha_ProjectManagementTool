import { useEffect, useState } from 'react';
import Modal from './Modal';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';
import { TASK_PRIORITIES, TASK_STATUSES, toDateInputValue } from '../utils/taskUtils';

const EMPTY_VALUES = {
  title: '',
  description: '',
  assigned_to: '',
  status: 'todo',
  priority: 'medium',
  due_date: '',
};

export default function TaskFormModal({
  isOpen,
  onClose,
  onSubmit,
  members = [],
  task = null,
  defaultStatus = 'todo',
  title,
  submitLabel,
  submittingLabel,
}) {
  const [form, setForm] = useState(EMPTY_VALUES);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const assignedId = task?.assigned_to ?? task?.assigned_user?.id ?? '';

    setForm({
      title: task?.title || '',
      description: task?.description || '',
      assigned_to: assignedId === '' || assignedId == null ? '' : String(assignedId),
      status: task?.status || defaultStatus || 'todo',
      priority: task?.priority || 'medium',
      due_date: toDateInputValue(task?.due_date),
    });
    setError('');
    setSubmitting(false);
  }, [isOpen, task, defaultStatus]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) {
      setError('Task title is required.');
      return;
    }

    if (form.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(form.due_date)) {
      setError('Enter a valid due date.');
      return;
    }

    setError('');
    setSubmitting(true);

    const payload = {
      title: trimmedTitle,
      description: form.description.trim() || null,
      assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
      status: form.status,
      priority: form.priority,
      due_date: form.due_date || null,
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to save task.'));
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form className="modal-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="task-title" className="form-label">
            Title
          </label>
          <input
            id="task-title"
            type="text"
            className="form-input"
            placeholder="Task title"
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="task-description" className="form-label">
            Description
          </label>
          <textarea
            id="task-description"
            className="form-textarea"
            placeholder="Optional description"
            rows={3}
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="task-assignee" className="form-label">
              Assigned Member
            </label>
            <select
              id="task-assignee"
              className="form-select"
              value={form.assigned_to}
              onChange={(e) => updateField('assigned_to', e.target.value)}
              disabled={submitting}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="task-status" className="form-label">
              Status
            </label>
            <select
              id="task-status"
              className="form-select"
              value={form.status}
              onChange={(e) => updateField('status', e.target.value)}
              disabled={submitting}
            >
              {TASK_STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="task-priority" className="form-label">
              Priority
            </label>
            <select
              id="task-priority"
              className="form-select"
              value={form.priority}
              onChange={(e) => updateField('priority', e.target.value)}
              disabled={submitting}
            >
              {TASK_PRIORITIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="task-due-date" className="form-label">
              Due Date
            </label>
            <input
              id="task-due-date"
              type="date"
              className="form-input"
              value={form.due_date}
              onChange={(e) => updateField('due_date', e.target.value)}
              disabled={submitting}
            />
          </div>
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
