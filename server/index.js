import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

import pool, { query } from './db.js';
import { aplicarMigraciones } from './migraciones.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import telemetriaRoutes from './routes/telemetria.js';
import evaluacionRoutes from './routes/evaluacion.js';
import guardadoRoutes, { beaconRouter } from './routes/guardado.js';
import cuestionarioRoutes from './routes/cuestionario.js';
import maestroRoutes from './routes/maestro.js';
import alumnoRoutes from './routes/alumno.js';

const app = express();
const PORT = process.env.PORT || 3001;

/* ── Middleware global ── */
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));
app.use(express.json());

/* ── Rutas API ── */
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', telemetriaRoutes);
app.use('/api', evaluacionRoutes);
app.use('/api', beaconRouter);
app.use('/api', guardadoRoutes);
app.use('/api', cuestionarioRoutes);
app.use('/api/maestro', maestroRoutes);
app.use('/api/alumno', alumnoRoutes);

/* ── Health check ── */
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS time');
    res.json({ status: 'ok', db_time: result.rows[0].time });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/* ── Arrancar servidor ── */
try {
  await aplicarMigraciones(query);
} catch (e) {
  console.error('El servidor NO arrancó: hay una migración pendiente con error. Corrígela y reinicia.');
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`\n CasaSTEAM API corriendo en http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});