import api from './api';

export async function getNotifications() {
  const { data } = await api.get('/notifications');
  return data;
}

export async function getUnreadCount() {
  const { data } = await api.get('/notifications/unread-count');
  return data;
}

export async function markNotificationAsRead(id) {
  const { data } = await api.put(`/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsAsRead() {
  const { data } = await api.put('/notifications/read-all');
  return data;
}

export async function deleteNotification(id) {
  const { data } = await api.delete(`/notifications/${id}`);
  return data;
}
