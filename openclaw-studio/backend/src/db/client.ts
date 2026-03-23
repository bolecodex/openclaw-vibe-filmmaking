import Database from "better-sqlite3";
import { readFileSync, readdirSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const defaultDbPath =
  process.env.BATCH_DB_PATH ||
  join(process.cwd(), "data", "batch.db");

let db: Database.Database | null = null;

export function getDb(path: string = defaultDbPath): Database.Database {
  if (db) return db;
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  return db;
}

function runMigrations(db: Database.Database): void {
  const migrationsDir = join(__dirname, "migrations");
  if (!existsSync(migrationsDir)) return;
  const files = readdirSync(migrationsDir)
    .filter((f: string) => f.endsWith(".sql"))
    .sort();
  for (const f of files) {
    const sql = readFileSync(join(migrationsDir, f), "utf-8");
    db.exec(sql);
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
