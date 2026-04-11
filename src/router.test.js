import { test, expect, beforeAll, afterAll } from 'bun:test'
import { discoverRoutes } from './router.js'
import path from 'node:path'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'

const FIXTURES = path.join(import.meta.dir, '__test_fixtures__')

beforeAll(() => {
  mkdirSync(path.join(FIXTURES, 'blog'), { recursive: true })
  mkdirSync(path.join(FIXTURES, 'public'), { recursive: true })
  writeFileSync(path.join(FIXTURES, 'index.phtml'), '<h1>Home</h1>')
  writeFileSync(path.join(FIXTURES, 'about.phtml'), '<h1>About</h1>')
  writeFileSync(path.join(FIXTURES, 'standalone.html'), '<!DOCTYPE html><html><body>Full doc</body></html>')
  writeFileSync(path.join(FIXTURES, 'blog', 'index.phtml'), '<h1>Blog</h1>')
  writeFileSync(path.join(FIXTURES, 'blog', '[slug].js'), `export async function GET(req) { return { post: { title: req.params.slug } } }`)
  writeFileSync(path.join(FIXTURES, 'blog', '[slug].phtml'), '<h1>{{post.title}}</h1>')
  writeFileSync(path.join(FIXTURES, 'readme.md'), '---\ntitle: Readme\n---\n\n# Readme')
  writeFileSync(path.join(FIXTURES, 'public', 'style.css'), 'body { margin: 0 }')
  writeFileSync(path.join(FIXTURES, '_layout.html'), '<main>{{content}}</main>')
})

afterAll(() => {
  rmSync(FIXTURES, { recursive: true, force: true })
})

test('discovers index.phtml as root route with kind page', async () => {
  const routes = await discoverRoutes(FIXTURES)
  const root = routes.find(r => r.pattern === '/')
  expect(root).toBeDefined()
  expect(root.kind).toBe('page')
})

test('discovers about.phtml as /about page', async () => {
  const routes = await discoverRoutes(FIXTURES)
  const about = routes.find(r => r.pattern === '/about')
  expect(about).toBeDefined()
  expect(about.kind).toBe('page')
})

test('discovers standalone.html as /standalone document', async () => {
  const routes = await discoverRoutes(FIXTURES)
  const doc = routes.find(r => r.pattern === '/standalone')
  expect(doc).toBeDefined()
  expect(doc.kind).toBe('document')
})

test('discovers blog/index.phtml as /blog page', async () => {
  const routes = await discoverRoutes(FIXTURES)
  const blog = routes.find(r => r.pattern === '/blog')
  expect(blog).toBeDefined()
  expect(blog.kind).toBe('page')
})

test('discovers [slug].js as /blog/:slug handler', async () => {
  const routes = await discoverRoutes(FIXTURES)
  const slug = routes.find(r => r.pattern === '/blog/:slug')
  expect(slug).toBeDefined()
  expect(slug.kind).toBe('handler')
})

test('[slug].js handler has template pointing to sibling .phtml', async () => {
  const routes = await discoverRoutes(FIXTURES)
  const slug = routes.find(r => r.pattern === '/blog/:slug')
  expect(slug.template).toBeDefined()
  expect(slug.template).toContain('[slug].phtml')
})

test('[slug].phtml is not registered as a separate route when .js sibling exists', async () => {
  const routes = await discoverRoutes(FIXTURES)
  const slugRoutes = routes.filter(r => r.pattern === '/blog/:slug')
  expect(slugRoutes).toHaveLength(1)
  expect(slugRoutes[0].kind).toBe('handler')
})

test('does not register files from public/ as routes', async () => {
  const routes = await discoverRoutes(FIXTURES)
  const publicRoute = routes.find(r => r.filePath.includes('/public/'))
  expect(publicRoute).toBeUndefined()
})

test('does not register _layout.html as a route', async () => {
  const routes = await discoverRoutes(FIXTURES)
  const layout = routes.find(r => r.filePath.includes('_layout'))
  expect(layout).toBeUndefined()
})

test('discovers .md file as markdown route', async () => {
  const routes = await discoverRoutes(FIXTURES)
  const md = routes.find(r => r.pattern === '/readme' && r.kind === 'markdown')
  expect(md).toBeDefined()
  expect(md.filePath).toContain('readme.md')
})
