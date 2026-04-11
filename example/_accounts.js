import { Database } from 'bun:sqlite'
import path from 'node:path'

const db = new Database(path.join(import.meta.dir, 'app.db'))

db.run(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )
`)

db.run(`
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    account_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
  )
`)

db.run(`
  CREATE TABLE IF NOT EXISTS auth_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event TEXT NOT NULL,
    account_id INTEGER,
    email TEXT,
    ip TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )
`)

// Migrations for existing databases
try { db.run(`ALTER TABLE accounts ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`) } catch {}
try { db.run(`ALTER TABLE sessions ADD COLUMN expires_at INTEGER`) } catch {}

// First registered account is the admin
db.run(`UPDATE accounts SET role = 'admin' WHERE id = (SELECT MIN(id) FROM accounts) AND role = 'user'`)

export function createAccount(email, passwordHash) {
  const isFirst = !db.query('SELECT 1 FROM accounts LIMIT 1').get()
  const result = db.run('INSERT INTO accounts (email, password_hash) VALUES (?, ?)', [email, passwordHash])
  if (isFirst) db.run("UPDATE accounts SET role = 'admin' WHERE id = ?", [result.lastInsertRowid])
  return result
}

export function findByEmail(email) {
  return db.query('SELECT * FROM accounts WHERE email = ?').get(email)
}

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60 // 30 days

export function createSession(accountId) {
  const token = crypto.randomUUID()
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  db.run('INSERT INTO sessions (token, account_id, expires_at) VALUES (?, ?, ?)', [token, accountId, expiresAt])
  return token
}

export function findSession(token) {
  return db.query(`
    SELECT accounts.id as accountId, accounts.email, accounts.role
    FROM sessions
    JOIN accounts ON sessions.account_id = accounts.id
    WHERE sessions.token = ?
    AND (sessions.expires_at IS NULL OR sessions.expires_at > unixepoch())
  `).get(token)
}

export function deleteSession(token) {
  db.run('DELETE FROM sessions WHERE token = ?', [token])
}

export function logAuthEvent(event, { accountId = null, email = null, ip = null } = {}) {
  db.run(
    'INSERT INTO auth_log (event, account_id, email, ip) VALUES (?, ?, ?, ?)',
    [event, accountId, email, ip]
  )
}
