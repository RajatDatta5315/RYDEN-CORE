import { neon } from '@neondatabase/serverless';

export async function getDb(env: any) {
  return neon(env.DATABASE_URL);
}
