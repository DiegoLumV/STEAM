import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  server: {
    port: 3000,
    open: true,
    // Proxy de las llamadas /api al backend Express
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      input: {
        main:    'src/index.html',
        learn:   'src/learn.html',
        sandbox: 'src/sandbox.html',
      },
      output: {
        manualChunks: {
          babylon: ['@babylonjs/core', '@babylonjs/loaders'],
        },
      },
    },
  },
});
