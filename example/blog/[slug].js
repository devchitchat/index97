import { getPost, deletePost } from './_db.js'
import { getSession, isAdmin, requireAdmin } from '../_auth.js'
import { renderMarkdown } from '../../src/markdown.js'

export async function GET(req) {
  const post = getPost(req.params.slug)
  if (!post) return new Response('', { status: 404 })
  const session = getSession(req)
  const { html, data } = renderMarkdown(post.body)
  return { post, body: html, isAdmin: isAdmin(session) }
}

export async function DELETE(req) {
  requireAdmin(req)
  deletePost(req.params.slug)
  return Response.redirect('/blog', 303)
}
