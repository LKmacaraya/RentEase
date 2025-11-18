import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export async function authRequired(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });

    const payload = jwt.verify(token, JWT_SECRET);
    const { rows } = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE id=$1', [payload.sub]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid token' });

    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}
