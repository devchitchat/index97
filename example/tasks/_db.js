import { Database } from 'bun:sqlite'
import path from 'node:path'

const db = new Database(path.join(import.meta.dir, 'tasks.db'))

db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0
  )
`)

export default db
