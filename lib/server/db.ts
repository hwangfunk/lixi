import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

const DATABASE_PATH = path.join(process.cwd(), "data", "lixi.sqlite");

let cachedDb: Database.Database | null = null;

function ensureDatabaseDirectory() {
  fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });
}

function runMigrations(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      normalized_phone TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS spins (
      id TEXT PRIMARY KEY,
      participant_id TEXT NOT NULL UNIQUE,
      prize_label TEXT NOT NULL,
      prize_amount INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(participant_id) REFERENCES participants(id)
    );
  `);
}

export function getDb(): Database.Database {
  if (cachedDb) {
    return cachedDb;
  }

  ensureDatabaseDirectory();
  const db = new Database(DATABASE_PATH);

  runMigrations(db);
  cachedDb = db;

  return db;
}

export { DATABASE_PATH };
