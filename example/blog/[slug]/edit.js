import { getPost, updatePost } from '../_db.js'
import { requireAdmin } from '../../_auth.js'

const MAX_TITLE_LENGTH = 255
const MAX_BODY_LENGTH = 100_000

export async function GET(req) {
  requireAdmin(req)
  const post = getPost(req.params.slug)
  if (!post) return new Response('', { status: 404 })
  return { post }
}

export async function PUT(req) {
  requireAdmin(req)
  const post = getPost(req.params.slug)
  if (!post) return new Response('', { status: 404 })
  const form = await req.formData()
  const title = (form.get('title') ?? '').trim().slice(0, MAX_TITLE_LENGTH)
  const body = (form.get('body') ?? '').trim().slice(0, MAX_BODY_LENGTH)
  if (!title) return new Response('Title is required', { status: 400 })
  updatePost(req.params.slug, title, body)
  return Response.redirect(`/blog/${req.params.slug}`, 303)
}
