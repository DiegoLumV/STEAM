# Notas sobre la parte administrativa

Para que cualquier persona pueda ejecutar y probar el sistema desde cero, debe seguir estos pasos:

### 1. Base de Datos
- Montar un servidor de **PostgreSQL** (versión 18 recomendada) usando **pgAdmin4**.
- Crear una base de datos vacía llamada `ProyectoUPV`.
- **Importante:** Ejecutar o restaurar el archivo `proyectoUPV.sql` (que viene en el proyecto) dentro de esa base de datos para crear todas las tablas necesarias.

### 2. Configuración del Entorno
- Crear un archivo llamado `.env` en la carpeta principal del proyecto con lo siguiente:

```env
DB_HOST=localhost
DB_PORT=5432       # (Si usas otro puerto en postgres, cámbialo)
DB_NAME=ProyectoUPV
DB_USER=postgres
DB_PASSWORD=tucontraseñadepostgresql
JWT_SECRET=casasteam_jwt_secret_2026_cambiar
PORT=3001          # (Si usas otro puerto para el backend, cámbialo)
```

### 3. Instalación y Ejecución
- Abrir la terminal en la carpeta del proyecto y ejecutar: `npm install` (esto instalará todas las dependencias de Node.js).
- Ejecutar el script semilla para crear los roles y el administrador de prueba: `npm run seed` (o `node server/seed.js`).
- Finalmente, arrancar todo el proyecto (Front y Back al mismo tiempo) con: `npm run dev:full`

### 4. Credenciales de Prueba
Una vez ejecutado, el usuario administrador generado por el seed es:
- **Correo:** `admin@casasteam.com`
- **Contraseña:** `Admin123!`
