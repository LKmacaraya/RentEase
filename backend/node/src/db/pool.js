import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
let cfg = {};
if (connectionString) {
  try {
    const u = new URL(connectionString);
    if (u.password && u.password.length > 0) {
      cfg = { connectionString };
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

export const pool = new Pool(cfg);

pool.on('error', (err) => {
  console.error('Unexpected PG client error', err);
});
