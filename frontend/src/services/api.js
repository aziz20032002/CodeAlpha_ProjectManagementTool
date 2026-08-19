import axios from 'axios';
import { apiUrl } from '../config/env';

const api = axios.create({
  baseURL: apiUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
