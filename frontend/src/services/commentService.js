import api from './api';

export async function getTaskComments(taskId) {
  const { data } = await api.get(`/tasks/${taskId}/comments`);
  return data;
}

export async function addComment(taskId, content) {
  const { data } = await api.post(`/tasks/${taskId}/comments`, { content });
  return data;
}

export async function updateComment(commentId, content) {
  const { data } = await api.put(`/comments/${commentId}`, { content });
  return data;
}

export async function deleteComment(commentId) {
  const { data } = await api.delete(`/comments/${commentId}`);
  return data;
}
