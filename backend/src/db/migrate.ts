import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { pool, db } from './connection';

export async function runMigrations(): Promise<void> {
  console.log('--- Starting Database Migration Runner (Solo Migrator Owner) ---');
  const client = await pool.connect();
  try {
    // Ensure essential PostgreSQL extensions exist
    console.log('Ensuring PostgreSQL extensions (vector, pg_trgm)...');
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS "vector";');
      console.log('Extension "vector" is active.');
    } catch (err: any) {
      console.warn('Notice: "vector" extension could not be enabled automatically:', err.message);
    }

    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm";');
      console.log('Extension "pg_trgm" is active.');
    } catch (err: any) {
      console.warn('Notice: "pg_trgm" extension could not be enabled automatically:', err.message);
    }

    // Run Drizzle migrations
    console.log('Applying migrations from ./drizzle/migrations folder...');
    await migrate(db, { migrationsFolder: './drizzle/migrations' });
    console.log('✓ All database migrations applied successfully.');
  } catch (error: any) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Migration script failed:', err);
      await pool.end();
      process.exit(1);
    });
}
