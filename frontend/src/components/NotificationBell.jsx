import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notificationService';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';
import NotificationItem from './NotificationItem';
import socket from '../services/socket';

function NotificationSkeleton() {
  return (
    <div className="notification-skeleton" aria-hidden="true">
      <span className="skeleton notification-skeleton__icon" />
      <span className="notification-skeleton__content">
        <span className="skeleton skeleton--text" />
        <span className="skeleton skeleton--text skeleton--short" />
      </span>
    </div>
  );
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const seenNotificationIds = useRef(new Set());
  const realtimeNotifications = useRef(new Map());
  const loadedRef = useRef(false);
  const countSyncing = useRef(false);
  const notificationDuringCountSync = useRef(false);
  const bellAnimationTimer = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [bellAnimating, setBellAnimating] = useState(false);

  useEffect(
    () => () => {
      if (bellAnimationTimer.current) clearTimeout(bellAnimationTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!user) {
      seenNotificationIds.current.clear();
      realtimeNotifications.current.clear();
      loadedRef.current = false;
      setNotifications([]);
      setUnreadCount(0);
      setIsOpen(false);
      setLoaded(false);
      return undefined;
    }

    let active = true;
    async function syncUnreadCount() {
      countSyncing.current = true;
      try {
        let result;
        do {
          notificationDuringCountSync.current = false;
          result = await getUnreadCount();
        } while (active && notificationDuringCountSync.current);
        if (active) setUnreadCount(Number(result.count) || 0);
      } catch {
        if (active) setUnreadCount(0);
      } finally {
        countSyncing.current = false;
      }
    }

    syncUnreadCount();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    function handleNotificationCreated({ notification }) {
      if (!notification?.id || seenNotificationIds.current.has(notification.id)) {
        return;
      }

      seenNotificationIds.current.add(notification.id);
      realtimeNotifications.current.set(notification.id, notification);
      if (countSyncing.current) notificationDuringCountSync.current = true;
      if (loadedRef.current) {
        setNotifications((prev) =>
          prev.some((item) => Number(item.id) === Number(notification.id))
            ? prev
            : [notification, ...prev],
        );
      }
      if (!notification.is_read) {
        setUnreadCount((count) => count + 1);
      }
      if (bellAnimationTimer.current) clearTimeout(bellAnimationTimer.current);
      setBellAnimating(false);
      requestAnimationFrame(() => setBellAnimating(true));
      bellAnimationTimer.current = setTimeout(() => setBellAnimating(false), 480);
    }

    socket.on('notification_created', handleNotificationCreated);
    return () => {
      socket.off('notification_created', handleNotificationCreated);
    };
  }, [user]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  async function loadNotifications() {
    setLoading(true);
    setError('');
    try {
      const data = await getNotifications();
      const fetchedIds = new Set(data.map((item) => item.id));
      const realtimeOnly = [...realtimeNotifications.current.values()].filter(
        (item) => !fetchedIds.has(item.id),
      );
      const merged = [...realtimeOnly, ...data];
      seenNotificationIds.current = new Set(merged.map((item) => item.id));
      loadedRef.current = true;
      setNotifications(merged);
      setUnreadCount(merged.filter((item) => !item.is_read).length);
      setLoaded(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load notifications.'));
    } finally {
      setLoading(false);
    }
  }

  async function togglePanel() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen && !loaded && !loading) await loadNotifications();
  }

  async function handleOpen(notification) {
    if (!notification.is_read) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item,
          ),
        );
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch (err) {
        setError(getApiErrorMessage(err, 'Unable to update notification.'));
        return;
      }
    }

    setIsOpen(false);
    if (notification.task_id) {
      navigate(`/tasks/${notification.task_id}`);
    } else if (notification.project_id) {
      navigate(`/projects/${notification.project_id}`);
    }
  }

  async function handleMarkAll() {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    setError('');
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, is_read: true })),
      );
      setUnreadCount(0);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to mark notifications as read.'));
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleDelete(notification) {
    if (deletingId) return;
    setDeletingId(notification.id);
    setError('');
    try {
      await deleteNotification(notification.id);
      setNotifications((prev) =>
        prev.filter((item) => item.id !== notification.id),
      );
      if (!notification.is_read) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to delete notification.'));
    } finally {
      setDeletingId(null);
    }
  }

  if (!user) return null;

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        type="button"
        className={`notification-bell__trigger${bellAnimating ? ' notification-bell__trigger--received' : ''}`}
        onClick={togglePanel}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-controls="notifications-panel"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        {unreadCount > 0 && (
          <span
            className={`notification-bell__badge${bellAnimating ? ' notification-bell__badge--received' : ''}`}
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          id="notifications-panel"
          className="notifications-panel"
          aria-labelledby="notifications-title"
        >
          <header className="notifications-panel__header">
            <h2 id="notifications-title">Notifications</h2>
            <div className="notifications-panel__header-actions">
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="notifications-panel__mark-all"
                  onClick={handleMarkAll}
                  disabled={markingAll}
                >
                  {markingAll ? 'Marking...' : 'Mark all as read'}
                </button>
              )}
              <button
                type="button"
                className="notifications-panel__close"
                onClick={() => setIsOpen(false)}
                aria-label="Close notifications"
              >
                ×
              </button>
            </div>
          </header>

          <div className="notifications-panel__body">
            {loading && (
              <div aria-label="Loading notifications">
                <NotificationSkeleton />
                <NotificationSkeleton />
                <NotificationSkeleton />
              </div>
            )}

            {!loading && error && (
              <div className="notifications-panel__state" role="alert">
                <p>{error}</p>
                <button type="button" className="btn btn--secondary btn--sm" onClick={loadNotifications}>
                  Try Again
                </button>
              </div>
            )}

            {!loading && !error && notifications.length === 0 && (
              <div className="notifications-panel__state">
                <p>No notifications yet.</p>
                <span>You're all caught up.</span>
              </div>
            )}

            {!loading && !error && notifications.length > 0 && (
              <div className="notifications-list">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onOpen={handleOpen}
                    onDelete={handleDelete}
                    deleting={deletingId === notification.id}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
