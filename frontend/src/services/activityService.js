import api from './api';

export async function getActivities() {
  const response = await api.get('/activities');
  return response.data;
}
