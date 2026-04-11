import db from './_db.js'
import { escapeHtml } from '../../index.js'
export async function GET() {
  const tasks = db.query('SELECT title FROM tasks WHERE done = 0 ORDER BY id DESC LIMIT 5').all()
  if (tasks.length === 0) return '<p>No pending tasks.</p>'
  const items = tasks.map(t => `<li>${escapeHtml(t.title)}</li>`).join('\n')
  return `<ul>\n${items}\n</ul>`
}
