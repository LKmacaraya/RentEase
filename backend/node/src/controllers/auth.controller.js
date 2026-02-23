import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const userRole = role === 'admin' ? 'admin' : 'renter';

    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id, name, email, role, created_at',
      [name, email, hash, userRole]
    );

    const user = rows[0];
    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

    const { rows } = await pool.query('SELECT id, name, email, password_hash, role FROM users WHERE email=$1', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    delete user.password_hash;
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  res.json({ user: req.user });
}

export async function updateMe(req, res, next) {
  try {
    const { name, email, password } = req.body || {};
    const safeName = typeof name === 'string' ? name.trim() : '';
    const safeEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!safeName || !safeEmail) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    if (password !== undefined && (typeof password !== 'string' || password.trim().length < 6)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email=$1 AND id<>$2', [safeEmail, req.user.id]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    let queryText = 'UPDATE users SET name=$1, email=$2';
    const queryParams = [safeName, safeEmail];

    if (password && password.trim()) {
      const hash = await bcrypt.hash(password.trim(), 10);
      queryText += ', password_hash=$3';
      queryParams.push(hash);
    }

    queryText += ` WHERE id=$${queryParams.length + 1} RETURNING id, name, email, role, created_at`;
    queryParams.push(req.user.id);

    const { rows } = await pool.query(queryText, queryParams);
    return res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
}
