import CommentItem from './CommentItem';

function CommentSkeleton() {
  return (
    <div className="comment-item comment-item--skeleton" aria-hidden="true">
      <div className="skeleton skeleton--avatar" />
      <div className="comment-item__body">
        <div className="skeleton skeleton--text skeleton--short" />
        <div className="skeleton skeleton--text" />
        <div className="skeleton skeleton--text skeleton--short" />
      </div>
    </div>
  );
}

export default function CommentList({
  comments,
  loading,
  error,
  onRetry,
  currentUserId,
  isProjectOwner,
  onUpdate,
  onDelete,
}) {
  if (loading) {
    return (
      <div className="comment-list" aria-label="Loading comments">
        <CommentSkeleton />
        <CommentSkeleton />
        <CommentSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="comments-error">
        <p>{error}</p>
        <button type="button" className="btn btn--secondary btn--sm" onClick={onRetry}>
          Try Again
        </button>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="comments-empty">
        <p>No comments yet.</p>
        <span>Start the conversation.</span>
      </div>
    );
  }

  return (
    <div className="comment-list">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          currentUserId={currentUserId}
          isProjectOwner={isProjectOwner}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
