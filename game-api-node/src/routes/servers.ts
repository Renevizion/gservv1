import { Router, Response } from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { pool, s3, redis, MINIO_BUCKET } from '../db/clients';
import { auth, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /servers
router.post('/', auth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, game, maxPlayers, region } = req.body;
  if (!name || !game) {
    res.status(400).json({ error: 'name and game are required' });
    return;
  }
  const validGames = ['minecraft', 'gta5', 'gta6', 'other'];
  if (!validGames.includes(game)) {
    res.status(400).json({ error: `game must be one of: ${validGames.join(', ')}` });
    return;
  }
  try {
    const result = await pool.query(
      `INSERT INTO servers (user_id, name, game, max_players, region, status)
       VALUES ($1, $2, $3, $4, $5, 'provisioning') RETURNING *`,
      [req.userId, name, game, maxPlayers || 20, region || 'us-east-1']
    );
    await redis.del(`servers:${req.userId}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /servers
router.get('/', auth, async (req: AuthRequest, res: Response): Promise<void> => {
  const cacheKey = `servers:${req.userId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) { res.json(JSON.parse(cached)); return; }
    const result = await pool.query(
      'SELECT * FROM servers WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    await redis.setEx(cacheKey, 30, JSON.stringify(result.rows));
    res.json(result.rows);
  } catch (err) {
    console.error('List servers error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /servers/:id
router.get('/:id', auth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT * FROM servers WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Server not found' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /servers/:id
router.patch('/:id', auth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, maxPlayers, status } = req.body;
  const validStatuses = ['running', 'stopped'];
  if (status && !validStatuses.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    return;
  }
  try {
    const result = await pool.query(
      `UPDATE servers
       SET name = COALESCE($1, name),
           max_players = COALESCE($2, max_players),
           status = COALESCE($3, status),
           updated_at = NOW()
       WHERE id = $4 AND user_id = $5 RETURNING *`,
      [name, maxPlayers, status, req.params.id, req.userId]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Server not found' }); return; }
    await redis.del(`servers:${req.userId}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /servers/:id
router.delete('/:id', auth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'DELETE FROM servers WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Server not found' }); return; }
    await redis.del(`servers:${req.userId}`);
    res.json({ ok: true, deleted: result.rows[0].id });
  } catch (err) {
    console.error('Delete server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /servers/:id/backup
router.post('/:id/backup', auth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT * FROM servers WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Server not found' }); return; }
    const server = result.rows[0];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `backups/${server.game}/${server.id}/${timestamp}.tar.gz`;
    await s3.send(new PutObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: key,
      Body: Buffer.from(`backup-placeholder-server-${server.id}`),
      Metadata: { serverId: String(server.id), game: server.game, timestamp },
    }));
    res.json({ ok: true, backup: key });
  } catch (err) {
    console.error('Backup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
