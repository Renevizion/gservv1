import express from 'express';
import { pool, redis } from './db/clients';
import authRoutes from './routes/auth';
import serverRoutes from './routes/servers';
import billingRoutes from './routes/billing';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.use('/auth', authRoutes);
app.use('/servers', serverRoutes);
app.use('/billing', billingRoutes);

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    const pong = await redis.ping();
    res.json({ status: 'ok', db: 'connected', redis: pong === 'PONG' ? 'connected' : 'error' });
  } catch (err: any) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  await redis.connect();
  app.listen(PORT, () => console.log(`game-api-node running on port ${PORT}`));
}

start().catch((err) => { console.error('Failed to start:', err); process.exit(1); });
