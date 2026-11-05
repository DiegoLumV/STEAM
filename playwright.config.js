// Configuración de las pruebas con navegador (solo *.spec.js).
// La API se simula dentro de las pruebas (tests/helpers.js): no usan base de datos ni backend.
// NUNCA definas UPDATE_GOLDEN=1 en una ejecución normal: sobrescribe tests/dorados/*.json.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.spec.js',
  workers: 1,
  timeout: 120_000,
  reporter: 'list',
  outputDir: 'node_modules/.playwright-resultados',
  use: {
    baseURL: 'http://localhost:3000',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx vite --port 3000 --strictPort',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
    env: { BROWSER: 'none' }, // vite.config.js tiene server.open: true; así no abre pestañas
  },
});
