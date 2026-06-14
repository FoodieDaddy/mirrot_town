/**
 * Database connection for PostgreSQL + pgvector.
 */

import pg from 'pg';

const { Pool } = pg;

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

const DEFAULT_CONFIG: DatabaseConfig = {
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432'),
  database: process.env.DB_NAME ?? 'jingzhong_biancheng',
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? '',
};

let pool: pg.Pool | null = null;

export function getPool(config: DatabaseConfig = DEFAULT_CONFIG): pg.Pool {
  if (!pool) {
    pool = new Pool(config);
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function initSchema(): Promise<void> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = await fs.readFile(schemaPath, 'utf-8');

  const pool = getPool();
  await pool.query(schema);
  console.log('[DB] Schema initialized');
}
