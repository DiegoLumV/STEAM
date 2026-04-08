# Constructor de Casa · STEAM
### Vite + Babylon.js v9 (local, sin CDN)

---

## ▶ Cómo arrancar

```bash
# 1. Instalar dependencias (solo la primera vez)
npm install

# 2. Levantar el servidor de desarrollo
npm run dev
```

Abre en el navegador: **http://localhost:3000**

---

## 📦 Build para producción

```bash
npm run build
# Los archivos quedan en /dist — puedes subirlos a cualquier hosting estático
```

---

## ¿Qué cambió respecto a la versión anterior?

| Antes (CDN) | Ahora (Vite + local) |
|---|---|
| `<script src="cdnjs.cloudflare.com/babylonjs/6.26.0/babylon.js">` | `import { Engine, Scene, ... } from '@babylonjs/core'` |
| Babylon 6.x | **Babylon 9.x** (más rápido, mejor física) |
| Todo en global `window.BABYLON` | ES modules con tree-shaking |
| Requería internet para cargar | **100% offline** |
| Sin bundler | **Vite** — hot reload instantáneo en dev |
| `usePercentageCloserFiltering` | **`useContactHardeningShadows`** (sombras más suaves) |
| SSAO podía fallar silenciosamente | SSAO importado directamente, fallo visible en consola |

## Estructura del proyecto

```
casa-vite/
├── package.json        ← dependencias (Babylon v9, Vite)
├── vite.config.js      ← configuración del bundler
└── src/
    ├── index.html      ← HTML (sin <script src=cdnjs>)
    ├── casa.js         ← JS con imports ES modules
    └── casa.css        ← CSS sin cambios
```
