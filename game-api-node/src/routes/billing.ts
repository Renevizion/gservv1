import { Router, Response } from 'express';
import { pool } from '../db/clients';
import { auth, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /billing
router.get('/', auth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT b.*, s.name AS server_name, s.game
       FROM billing b JOIN servers s ON s.id = b.server_id
       WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List billing error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /billing/summary
router.get('/summary', auth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*) AS total_invoices,
         SUM(amount) FILTER (WHERE status = 'paid') AS total_paid,
         SUM(amount) FILTER (WHERE status = 'pending') AS total_pending
       FROM billing WHERE user_id = $1`,
      [req.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Billing summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /billing
router.post('/', auth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { serverId, amount, periodStart, periodEnd } = req.body;
  if (!serverId || !amount || !periodStart || !periodEnd) {
    res.status(400).json({ error: 'serverId, amount, periodStart, periodEnd are required' });
    return;
  }
  try {
    const check = await pool.query(
      'SELECT id FROM servers WHERE id = $1 AND user_id = $2',
      [serverId, req.userId]
    );
    if (!check.rows[0]) { res.status(404).json({ error: 'Server not found' }); return; }
    const result = await pool.query(
      `INSERT INTO billing (user_id, server_id, amount, period_start, period_end)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, serverId, amount, periodStart, periodEnd]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create billing error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /billing/:id/pay
router.patch('/:id/pay', auth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      `UPDATE billing SET status = 'paid' WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) { res.status(404).json({ error: 'Invoice not found' }); return; }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Pay invoice error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
