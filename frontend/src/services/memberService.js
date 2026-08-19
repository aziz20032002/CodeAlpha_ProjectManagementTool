import api from './api';

export async function getProjectMembers(projectId) {
  const { data } = await api.get(`/projects/${projectId}/members`);
  return data;
}

export async function addProjectMember(projectId, email) {
  const { data } = await api.post(`/projects/${projectId}/members`, {
    email,
  });
  return data;
}

export async function removeProjectMember(projectId, userId) {
  const { data } = await api.delete(
    `/projects/${projectId}/members/${userId}`,
  );
  return data;
}
