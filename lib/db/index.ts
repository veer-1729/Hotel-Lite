import 'server-only';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

export function getDb() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      'No database connection string was provided to `neon()`. Perhaps an environment variable has not been set?'
    );
  }
  return drizzle(neon(url), { schema });
}

export async function pingDatabase(): Promise<{ ok: true; latencyMs: number }> {
  const start = Date.now();
  const db = getDb();
  await db.execute(sql`SELECT 1`);
  return { ok: true, latencyMs: Date.now() - start };
}
