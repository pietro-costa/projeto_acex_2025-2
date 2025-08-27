import fs from 'fs';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const sql = fs.readFileSync(new URL('./migrate.pg.sql', import.meta.url), 'utf-8');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

try {
  await pool.query(sql);
  console.log('Migration executada.');
} catch (e) {
  console.error('Migration falhou:', e.message);
} finally {
  await pool.end();
}