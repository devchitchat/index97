import db from './_db.js'
import { requireAdmin } from '../_auth.js'

const MAX_TITLE_LENGTH = 255

function parseId(raw) {
  const id = parseInt(raw, 10)
  return isNaN(id) ? null : id
}

export async function DELETE(req) {
  requireAdmin(req)
  const id = parseId(req.params.id)
  if (id === null) return new Response('', { status: 400 })
  db.run('DELETE FROM tasks WHERE id = ?', [id])
  return Response.redirect('/tasks', 303)
}

export async function PATCH(req) {
  requireAdmin(req)
  const id = parseId(req.params.id)
  if (id === null) return new Response('', { status: 400 })
  const form = await req.formData()
  const title = (form.get('title') ?? '').trim().slice(0, MAX_TITLE_LENGTH)
  if (!title) return Response.redirect('/tasks', 303)
  db.run('UPDATE tasks SET title = ? WHERE id = ?', [title, id])
  return Response.redirect('/tasks', 303)
}
