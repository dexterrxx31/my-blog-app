const path = require("path");
const fs = require("fs");
const { createClient } = require("@libsql/client");

// Production (Render): set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN.
// Local dev: falls back to a plain SQLite file — no Turso account needed.
let url = process.env.TURSO_DATABASE_URL;
if (!url) {
  const dataDir = path.join(__dirname, "..", "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  url = "file:" + path.join(dataDir, "blog.db");
}

const db = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function init() {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS posts (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        title           TEXT NOT NULL,
        slug            TEXT NOT NULL UNIQUE,
        content         TEXT NOT NULL,
        html            TEXT NOT NULL,
        excerpt         TEXT NOT NULL,
        cover_image_url TEXT,
        reading_time    INTEGER NOT NULL DEFAULT 1,
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC)`,
      `CREATE TABLE IF NOT EXISTS tags (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        slug TEXT NOT NULL UNIQUE
      )`,
      `CREATE TABLE IF NOT EXISTS post_tags (
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        tag_id  INTEGER NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
        PRIMARY KEY (post_id, tag_id)
      )`,
      `CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        username      TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL
      )`,
    ],
    "write"
  );
}

module.exports = { db, init };
