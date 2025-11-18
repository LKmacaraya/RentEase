import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcrypt';

dotenv.config();

const { Pool } = pg;

async function ensureUser(pool, { name, email, password, role }) {
  const { rows } = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
  if (rows.length) {
    return rows[0].id;
  }
  const hash = await bcrypt.hash(password, 10);
  const res = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1,$2,$3,$4) RETURNING id`,
    [name, email, hash, role]
  );
  return res.rows[0].id;
}

async function run() {
  const cs = process.env.DATABASE_URL;
  let cfg;
  if (cs) {
    try {
      const u = new URL(cs);
      if (u.password && u.password.length > 0) {
        cfg = { connectionString: cs };
      }
    } catch {}
  }
  if (!cfg) {
    cfg = {
      host: process.env.PGHOST,
      port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
    };
  }
  const pool = new Pool(cfg);
  try {
    console.log('[seed] Seeding fixed accounts...');
    const adminId = await ensureUser(pool, {
      name: 'Administrator',
      email: 'admin@rentease.local',
      password: 'admin123',
      role: 'admin',
    });
    const userId = await ensureUser(pool, {
      name: 'User One',
      email: 'user1@rentease.local',
      password: 'password123',
      role: 'renter',
    });
    console.log(`[seed] Done. Admin ID: ${adminId}, User ID: ${userId}`);
  } catch (err) {
    console.error('[seed] Failed:', err.message);
    process.exitCode = 1;
  }
}

run();
