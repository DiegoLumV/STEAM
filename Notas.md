# Notas sobre la parte administrativa

Para que cualquier persona pueda ejecutar y probar el sistema desde cero, debe seguir estos pasos:

### 1. Base de Datos
- Montar un servidor de **PostgreSQL** (versión 18 recomendada) usando **pgAdmin4**.
- Crear una base de datos vacía llamada `ProyectoUPV`.
- **Importante:** Restaurar el archivo `proyectoUPV.sql` (que viene en el proyecto) dentro de esa base de datos. Es un respaldo en **formato custom de PostgreSQL**, así que NO se ejecuta como consulta SQL: usa la función **Restore** de pgAdmin4 (clic derecho sobre la base `ProyectoUPV` → Restore, formato Custom) o `pg_restore -U postgres -d ProyectoUPV proyectoUPV.sql`. Trae solo los roles, los usuarios y las tablas académicas; el resto de las tablas las crea el servidor solo (ver paso 3).

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
- Crear las tablas faltantes aplicando las migraciones (esto también ocurre solo cada vez que arranca el servidor): `node server/migrar.js`. Es necesario antes del siguiente paso porque el catálogo se inserta en tablas que crean las migraciones.
- Cargar el catálogo de dimensiones STEAM, habilidades y actividades, **una sola vez al instalar**: `node server/steam_seed.js` (no tiene comando `npm`). Revisado: todos sus `INSERT` usan `ON CONFLICT DO NOTHING` sobre el nombre o la llave primaria, así que repetirlo no duplica datos; si falla, solo imprime el error en consola y termina sin código de error, por lo que conviene revisar que diga «Seed STEAM completado».
- Finalmente, arrancar todo el proyecto (Front y Back al mismo tiempo) con: `npm run dev:full`

**Sobre la base de datos:** las migraciones de `server/migraciones.js` se aplican automáticamente en cada arranque del servidor (son idempotentes: no duplican ni borran nada). Los scripts SQL antiguos (`server/steam_tables.sql`, `server/steam_proyectos_patch.sql`, `database/DBProyectoSTEAM.sql`, `guardados.sql`) **no forman parte del procedimiento normal de instalación**.

> ⚠️ **Advertencia:** `server/steam_tables.sql` contiene operaciones destructivas (`DROP TABLE … CASCADE` sobre `calificaciones`, `avance_rutas` y `rutas_aprendizaje`). **No lo ejecutes sobre una base de datos existente cuya información quieras conservar.**

### 4. Credenciales de Prueba
Una vez ejecutado, el usuario administrador generado por el seed es:
- **Correo:** `admin@casasteam.com`
- **Contraseña:** `Admin123!`
