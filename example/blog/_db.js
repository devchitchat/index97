import { Database } from 'bun:sqlite'
import path from 'node:path'

const db = new Database(path.join(import.meta.dir, 'blog.db'))

db.run(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  )
`)

export function getAllPosts() {
  return db.query('SELECT id, slug, title, created_at, substr(body, 0, 255) as excerpt FROM posts ORDER BY created_at DESC').all()
}

export function getPost(slug) {
  return db.query('SELECT * FROM posts WHERE slug = ?').get(slug)
}

export function createPost(slug, title, body) {
  db.run('INSERT INTO posts (slug, title, body) VALUES (?, ?, ?)', [slug, title, body])
}

export function updatePost(slug, title, body) {
  db.run('UPDATE posts SET title = ?, body = ?, updated_at = unixepoch() WHERE slug = ?', [title, body, slug])
}

export function deletePost(slug) {
  db.run('DELETE FROM posts WHERE slug = ?', [slug])
}

export function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
