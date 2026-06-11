import 'server-only';

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

let pool: Pool | undefined;
let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

function getPool(): Pool {
  if (!pool) {
    const url = process.env.POSTGRES_URL;
    if (!url) {
      throw new Error(
        'No database connection string was provided to the pool. Perhaps an environment variable has not been set?'
      );
    }
    pool = new Pool({
      connectionString: url,
      max: parseInt(process.env.DB_POOL_MAX || '2', 10)
    });
  }
  return pool;
}

export function getDb() {
  if (!db) {
    db = drizzle(getPool(), { schema });
  }
  return db;
}

export function getPoolStats() {
  const p = getPool();
  return {
    totalCount: p.totalCount,
    idleCount: p.idleCount,
    waitingCount: p.waitingCount
  };
}

export async function pingDatabase(): Promise<{ ok: true; latencyMs: number }> {
  const start = Date.now();
  const db = getDb();
  await db.execute(sql`SELECT 1`);
  return { ok: true, latencyMs: Date.now() - start };
}
