import db from '../_db.js'
import { requireAdmin } from '../../_auth.js'

export async function POST(req) {
  requireAdmin(req)
  db.run('UPDATE tasks SET done = NOT done WHERE id = ?', [req.params.id])
  return Response.redirect('/tasks', 303)
}
