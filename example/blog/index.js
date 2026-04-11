import { getAllPosts } from './_db.js'
import { getSession, isAdmin } from '../_auth.js'
import { renderMarkdown } from '../../src/markdown.js'
export async function GET(req) {
  const session = getSession(req)
  const posts = getAllPosts().map(post => {
    const { html, data } = renderMarkdown(post.excerpt)
    return { ...post, body: html, excerpt: data.excerpt }
  })
  return { posts, isAdmin: isAdmin(session) }
}
