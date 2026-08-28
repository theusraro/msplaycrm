import fs from 'node:fs';
import path from 'node:path';

export async function runMigrations(connectionString?: string): Promise<{ success: boolean; executed: string[] }> {
  const migrationsDir = path.resolve(process.cwd(), 'server', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.info('[Migrator] Diretório de migrations não encontrado.');
    return { success: true, executed: [] };
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const connStr =
    connectionString ||
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER || 'msplay'}:${process.env.DB_PASSWORD || 'msplay_secret'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'msplay_db'}`;

  const executed: string[] = [];

  try {
    // @ts-ignore
    const pg = await import('pg');
    const { Client } = pg.default || pg;
    const client = new Client({ connectionString: connStr });
    await client.connect();

    // Create migrations history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    for (const file of files) {
      const check = await client.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);
      if (check.rows.length === 0) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        console.info(`[Migrator] 🚀 Executando migration: ${file}...`);
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        executed.push(file);
        console.info(`[Migrator] ✅ Migration ${file} concluída com sucesso.`);
      }
    }

    await client.end();
    return { success: true, executed };
  } catch (err: any) {
    console.warn(`[Migrator] Execução direta via PostgreSQL não realizada: ${err.message}. Em DEV o provedor local gerencia as entidades.`);
    return { success: false, executed };
  }
}

if (process.argv[1] && process.argv[1].endsWith('migrator.ts')) {
  runMigrations();
}
