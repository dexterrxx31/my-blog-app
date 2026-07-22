# Daily Journal

A modern blog built with Express, EJS and SQLite (via [libSQL](https://github.com/tursodatabase/libsql), so it runs on a local file in development and on [Turso](https://turso.tech)'s free tier in production).

**Features:** admin auth · Markdown posts with XSS sanitization · auto excerpts & reading time · tags · search · cover images · dark mode · slug URLs.

## Local development

```bash
npm install
cp .env.example .env   # then edit ADMIN_PASSWORD etc.
npm run seed           # creates admin user + sample posts
npm run dev            # http://localhost:3000
```

No database setup needed locally — it writes to `data/blog.db` automatically.
Log in via the "Admin" link in the footer.

## Free deployment (Render + Turso)

1. **Turso** (free database): sign up at [turso.tech](https://turso.tech), create a database, and copy its **URL** (`libsql://…`) and an **auth token**.
2. **Seed production**: from your machine, run the seed against Turso once:
   ```bash
   TURSO_DATABASE_URL=libsql://… TURSO_AUTH_TOKEN=… npm run seed
   ```
3. **Render** (free hosting): sign up at [render.com](https://render.com) → **New → Blueprint** → connect this GitHub repo. Render reads `render.yaml`; paste `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` when prompted.

Note: Render's free tier spins down after 15 minutes of inactivity — the first request after that takes ~30s to wake up. Data is safe in Turso regardless.

## Environment variables

| Variable | Purpose |
|---|---|
| `SESSION_SECRET` | Signs the session cookie |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Admin login (used by `npm run seed`) |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Turso connection (omit locally to use `data/blog.db`) |
| `PORT` | Server port (default 3000) |
