const developmentApiUrl = 'http://localhost:3000/api';
const developmentSocketUrl = 'http://localhost:3000';

export const apiUrl =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? developmentApiUrl : null);

export const socketUrl =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.DEV ? developmentSocketUrl : null);

if (!apiUrl || !socketUrl) {
  throw new Error('Frontend API and Socket URLs are required in production');
}
