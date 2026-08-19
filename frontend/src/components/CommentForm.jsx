import { useState } from 'react';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';

export default function CommentForm({ onSubmit }) {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setError('Comment cannot be empty.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await onSubmit(trimmedContent);
      setContent('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to add comment.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <label htmlFor="new-comment" className="form-label">
        Add a comment
      </label>
      <textarea
        id="new-comment"
        className="form-textarea comment-form__textarea"
        placeholder="Write a comment..."
        rows={3}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        disabled={submitting}
      />
      <div className="comment-form__footer">
        {error ? (
          <p className="form-error comment-form__error" role="alert">
            {error}
          </p>
        ) : (
          <span />
        )}
        <button type="submit" className="btn btn--primary btn--sm" disabled={submitting}>
          {submitting ? 'Posting...' : 'Comment'}
        </button>
      </div>
    </form>
  );
}
