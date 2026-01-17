import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5174, // Sprint branch uses different port to avoid disrupting kids' game
    host: true, // Allow connections from other devices on the network
  },
  build: {
    outDir: 'dist',
  },
});
