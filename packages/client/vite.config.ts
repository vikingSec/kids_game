import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true, // Allow connections from other devices on the network
  },
  build: {
    outDir: 'dist',
  },
});
