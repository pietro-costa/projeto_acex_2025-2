import fs from 'fs';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const sql = fs.readFileSync(new URL('./migrate.pg.sql', import.meta.url), 'utf-8');

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: { rejectUnauthorized: false },
});

try {
  await pool.query(sql);
  console.log('Migration executada.');
} catch (e) {
  console.error('Migration falhou:', e.message);
} finally {
  await pool.end();
}