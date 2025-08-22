import fs from 'fs';
import { createPool } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const sql = fs.readFileSync(new URL('./migrate.sql', import.meta.url), 'utf-8');

async function main(){
  const pool = createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT || 3306),
    multipleStatements: true
  });
  try {
    await pool.query(sql);
    console.log('✅ Migration executed successfully.');
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
  } finally {
    await pool.end();
  }
}

main();
