import { defineConfig } from 'vite';

export default defineConfig({
  // Punto de entrada en src/
  root: 'src',
  // La carpeta de salida al hacer build queda en dist/ (fuera de src)
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true,
  },
  // Babylon tiene módulos muy grandes — aumentamos el límite de advertencia
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        // Separar babylon en su propio chunk para caché más eficiente
        manualChunks: {
          babylon: ['@babylonjs/core', '@babylonjs/loaders'],
        },
      },
    },
  },
});
