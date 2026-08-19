import { useEffect, useState } from 'react';
import { formatDateTime } from '../utils/formatDate';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';
import { getInitials } from '../utils/getInitials';

export default function CommentItem({
  comment,
  currentUserId,
  isProjectOwner,
  onUpdate,
  onDelete,
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(comment.content);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isAuthor = Number(comment.author?.id) === Number(currentUserId);
  const canDelete = isAuthor || isProjectOwner;

  useEffect(() => {
    if (!editing) setContent(comment.content);
  }, [comment.content, editing]);

  function cancelEdit() {
    setContent(comment.content);
    setError('');
    setEditing(false);
  }

  async function saveEdit() {
    if (saving) return;
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setError('Comment cannot be empty.');
      return;
    }

    setError('');
    setSaving(true);
    try {
      await onUpdate(comment.id, trimmedContent);
      setEditing(false);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to update comment.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="comment-item">
      <div className="comment-avatar" aria-hidden="true">
        {getInitials(comment.author?.name)}
      </div>
      <div className="comment-item__body">
        <div className="comment-item__header">
          <div className="comment-item__identity">
            <strong>{comment.author?.name || 'Unknown user'}</strong>
            {comment.author?.email && <span>{comment.author.email}</span>}
          </div>
          <time dateTime={comment.created_at}>{formatDateTime(comment.created_at)}</time>
        </div>

        {editing ? (
          <div className="comment-edit">
            <label htmlFor={`comment-${comment.id}`} className="sr-only">
              Edit comment
            </label>
            <textarea
              id={`comment-${comment.id}`}
              className="form-textarea"
              rows={3}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              disabled={saving}
              autoFocus
            />
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="comment-edit__actions">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={cancelEdit}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={saveEdit}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="comment-item__content">{comment.content}</p>
            {(isAuthor || canDelete) && (
              <div className="comment-item__actions">
                {isAuthor && (
                  <button
                    type="button"
                    className="comment-action"
                    onClick={() => setEditing(true)}
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    className="comment-action comment-action--danger"
                    onClick={() => onDelete(comment)}
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </article>
  );
}
