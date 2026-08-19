import api from './api';

export async function getProjectTasks(projectId) {
  const { data } = await api.get(`/projects/${projectId}/tasks`);
  return data;
}

export async function getTaskById(taskId) {
  const { data } = await api.get(`/tasks/${taskId}`);
  return data;
}

export async function createTask(projectId, payload) {
  const { data } = await api.post(`/projects/${projectId}/tasks`, payload);
  return data;
}

export async function updateTask(taskId, payload) {
  const { data } = await api.put(`/tasks/${taskId}`, payload);
  return data;
}

export async function deleteTask(taskId) {
  const { data } = await api.delete(`/tasks/${taskId}`);
  return data;
}
