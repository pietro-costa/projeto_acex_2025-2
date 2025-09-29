import * as dotenv from 'dotenv';
dotenv.config();
import pkg from 'pg';

const { Pool } = pkg;

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

pool.on('error', (err) => {
  console.error('[pg pool error]', err?.code || err?.message, err);
});