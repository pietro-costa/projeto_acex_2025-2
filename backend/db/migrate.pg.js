import fs from 'fs';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const sql = fs.readFileSync(new URL('./migrate.pg.sql', import.meta.url), 'utf-8');

const useSSL =
  String(process.env.PGSSLMODE || '').toLowerCase() === 'require' ||
  process.env.NODE_ENV === 'production';

export const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: useSSL ? { rejectUnauthorized: false } : undefined,
      }
    : {
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        ssl: useSSL ? { rejectUnauthorized: false } : undefined,
      }
);

try {
  await pool.query(sql);
  console.log('Migration executada.');
} catch (e) {
  console.error('Migration falhou:', e.message);
} finally {
  await pool.end();
}