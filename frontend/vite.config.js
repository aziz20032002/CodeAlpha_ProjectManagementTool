import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  if (mode === 'production') {
    for (const name of ['VITE_API_URL', 'VITE_SOCKET_URL']) {
      if (!env[name]) {
        throw new Error(`${name} is required for a production build`);
      }
      const url = new URL(env[name]);
      if (url.protocol !== 'https:') {
        throw new Error(`${name} must use HTTPS for a production build`);
      }
    }
  }

  return {
    plugins: [react()],
    build: {
      sourcemap: false,
    },
  };
});
