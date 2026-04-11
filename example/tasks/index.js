import db from './_db.js'
import { requireAdmin, getSession, isAdmin } from '../_auth.js'

export async function GET(req) {
  const session = getSession(req)
  const admin = isAdmin(session)
  const editingId = admin ? (parseInt(new URL(req.url).searchParams.get('edit'), 10) || NaN) : NaN
  if (editingId === NaN) return { tasks: [], isAdmin: admin}
  const tasks = db.query('SELECT * FROM tasks ORDER BY id DESC').all()
    .map(t => ({ ...t, isAdmin: admin, doneLabel: t.done ? '✓' : '○', doneClass: t.done ? 'done' : '', shouldShowEditMode: t.id === editingId }))

  return { tasks, isAdmin: admin }
}

const MAX_TITLE_LENGTH = 255

export async function POST(req) {
  requireAdmin(req)
  const form = await req.formData()
  const title = (form.get('title') ?? '').trim().slice(0, MAX_TITLE_LENGTH)
  if (title) db.run('INSERT INTO tasks (title) VALUES (?)', [title])
  return Response.redirect('/tasks', 303)
}
