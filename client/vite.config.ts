import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development the API runs on :4000. Proxying keeps the browser on a single
// origin, so REST calls and the Socket.IO connection behave like production.
const apiTarget = process.env.VITE_DEV_API_PROXY ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/socket.io': { target: apiTarget, ws: true, changeOrigin: true },
    },
  },
});
