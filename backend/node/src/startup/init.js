import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { pool } from '../db/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigrations() {
  const dir = path.resolve(__dirname, '../db/migrations');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.sql'))
    .sort();
  if (files.length === 0) return;
  console.log('[migrate] applying', files.length, 'file(s)');
  await pool.query('BEGIN');
  try {
    for (const f of files) {
      const p = path.join(dir, f);
      const sql = fs.readFileSync(p, 'utf8');
      await pool.query(sql);
      console.log(`[migrate] applied ${f}`);
    }
    await pool.query('COMMIT');
    console.log('[migrate] done');
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('[migrate] failed:', err.message);
    throw err;
  }
}

async function ensureUser({ name, email, password, role }) {
  const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
  if (existing.rows.length) return existing.rows[0].id;
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id',
    [name, email, hash, role]
  );
  return rows[0].id;
}

async function seedDefaults() {
  console.log('[seed] seeding default users...');
  const adminId = await ensureUser({
    name: 'Administrator',
    email: 'admin@rentease.local',
    password: 'admin123',
    role: 'admin',
  });
  const userId = await ensureUser({
    name: 'User One',
    email: 'user1@rentease.local',
    password: 'password123',
    role: 'renter',
  });
  console.log(`[seed] done. Admin ID: ${adminId}, User ID: ${userId}`);
}

export async function init() {
  if (process.env.RUN_MIGRATIONS === 'true') {
    await applyMigrations();
  }
  if (process.env.RUN_SEEDS === 'true') {
    await seedDefaults();
  }
}
