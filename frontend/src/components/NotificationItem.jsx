import { formatDateTime } from '../utils/formatDate';

function TypeIcon({ type }) {
  if (type === 'task_comment') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      </svg>
    );
  }

  if (type === 'task_reassigned') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m17 3 4 4-4 4M3 7h18M7 21l-4-4 4-4M21 17H3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

export default function NotificationItem({ notification, onOpen, onDelete, deleting }) {
  return (
    <article
      className={`notification-item${
        notification.is_read ? '' : ' notification-item--unread'
      }`}
    >
      <button
        type="button"
        className="notification-item__main"
        onClick={() => onOpen(notification)}
        aria-label={`${notification.is_read ? '' : 'Unread notification: '}${notification.message}`}
      >
        <span className={`notification-item__icon notification-item__icon--${notification.type}`}>
          <TypeIcon type={notification.type} />
        </span>
        <span className="notification-item__content">
          <span className="notification-item__message">{notification.message}</span>
          <time dateTime={notification.created_at}>
            {formatDateTime(notification.created_at)}
          </time>
        </span>
        {!notification.is_read && (
          <span className="notification-item__dot" aria-label="Unread" />
        )}
      </button>
      <button
        type="button"
        className="notification-item__delete"
        onClick={(event) => {
          event.stopPropagation();
          onDelete(notification);
        }}
        aria-label="Delete notification"
        title="Delete"
        disabled={deleting}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </article>
  );
}
