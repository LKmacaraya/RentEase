import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'RentEase API' });
});

router.get('/db', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'unavailable', message: err.message });
  }
});

export default router;
