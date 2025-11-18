import fs from 'fs';
import path from 'path';
import url from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Pool } = pg;
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const dir = path.resolve(__dirname, '../src/db/migrations');
  const files = fs.readdirSync(dir)
    .filter(f => f.toLowerCase().endsWith('.sql'))
    .sort();
  const cs = process.env.DATABASE_URL;
  let cfg;
  if (cs) {
    try {
      const u = new URL(cs);
      if (u.password && u.password.length > 0) {
        cfg = { connectionString: cs };
      } else {
        cfg = {
          host: process.env.PGHOST,
          port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
          user: process.env.PGUSER,
          password: process.env.PGPASSWORD,
          database: process.env.PGDATABASE,
        };
      }
    } catch {
      cfg = {
        host: process.env.PGHOST,
        port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
      };
    }
  } else {
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
    await pool.query('BEGIN');
    for (const f of files) {
      const p = path.join(dir, f);
      const sql = fs.readFileSync(p, 'utf8');
      await pool.query(sql);
      console.log(`[migrate] applied ${f}`);
    }
    await pool.query('COMMIT');
    console.log('Migrations applied successfully.');
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
