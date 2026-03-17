import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/workflows': 'http://localhost:5000',
      '/steps': 'http://localhost:5000',
      '/rules': 'http://localhost:5000',
      '/executions': 'http://localhost:5000',
    },
  },
});
