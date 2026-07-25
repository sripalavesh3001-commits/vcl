// Uses Node's built-in `node:sqlite` module instead of a native npm addon
// (like better-sqlite3), so `npm install` never needs a C++ build toolchain —
// this avoids the common Windows "Visual Studio / node-gyp" install failure.
// Requires Node.js >= 22.13.0 (no --experimental-sqlite flag needed from that
// version onward; ships as a Release Candidate as of Node 24).
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'db');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'chemlab.sqlite'));
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('student','teacher','admin')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lab_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  formula TEXT NOT NULL,
  display_name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'g',
  purity REAL DEFAULT 99.0,
  concentration REAL,
  source_type TEXT DEFAULT 'element',
  added_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reaction_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reactants TEXT NOT NULL,
  reaction_id TEXT,
  equation TEXT,
  result_type TEXT,
  performed_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS experiment_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  experiment_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','completed')),
  score INTEGER,
  completed_at TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, experiment_id)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT,
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  score_percent REAL NOT NULL,
  taken_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  earned_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, badge_key)
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  item_key TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, item_type, item_key)
);

CREATE TABLE IF NOT EXISTS tutor_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

// Login/registration has been removed from this app. Every request now acts
// as a single built-in demo account so all the existing per-user features
// (inventory, notes, favorites, progress, etc.) keep working unchanged.
db.exec(`
INSERT OR IGNORE INTO users (id, name, email, password_hash, role)
VALUES (1, 'Guest User', 'guest@vchemlab.local', 'no-login', 'student');
`);

// Thin wrapper so route code can keep calling db.prepare(sql).get/all/run(...params)
// exactly as before, while transparently converting any BigInt values that
// node:sqlite may return (e.g. large rowids) into regular numbers so they
// serialize safely with JSON.stringify / jsonwebtoken.
function toSafeNumber(v) {
  return typeof v === 'bigint' ? Number(v) : v;
}
function sanitizeRow(row) {
  if (!row || typeof row !== 'object') return row;
  for (const key of Object.keys(row)) row[key] = toSafeNumber(row[key]);
  return row;
}

const originalPrepare = db.prepare.bind(db);
db.prepare = (sql) => {
  const stmt = originalPrepare(sql);
  const originalGet = stmt.get.bind(stmt);
  const originalAll = stmt.all.bind(stmt);
  const originalRun = stmt.run.bind(stmt);
  stmt.get = (...params) => sanitizeRow(originalGet(...params));
  stmt.all = (...params) => originalAll(...params).map(sanitizeRow);
  stmt.run = (...params) => {
    const info = originalRun(...params);
    return { ...info, lastInsertRowid: toSafeNumber(info.lastInsertRowid), changes: toSafeNumber(info.changes) };
  };
  return stmt;
};

module.exports = db;
