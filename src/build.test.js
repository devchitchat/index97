import { test, expect, beforeAll, afterAll } from 'bun:test'
import { patternToUrl, urlToOutputPath, enumerateUrls, copyPublicDir, rewriteBase } from './build.js'
import path from 'node:path'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'

const FIXTURES = path.join(import.meta.dir, '__build_fixtures__')

beforeAll(() => {
  mkdirSync(path.join(FIXTURES, 'blog'), { recursive: true })
  writeFileSync(path.join(FIXTURES, 'index.phtml'), '<h1>Home</h1>')
  writeFileSync(path.join(FIXTURES, 'about.phtml'), '<h1>About</h1>')
  writeFileSync(path.join(FIXTURES, 'blog', 'index.js'),
    `export async function GET() { return {} }\nexport async function staticPaths() { return [] }`)
  writeFileSync(path.join(FIXTURES, 'blog', 'index.phtml'), '<h1>Blog</h1>')
  writeFileSync(path.join(FIXTURES, 'blog', '[slug].js'),
    `export async function GET() { return {} }\nexport async function staticPaths() { return [{ slug: 'hello-world' }, { slug: 'second-post' }] }`)
  writeFileSync(path.join(FIXTURES, 'blog', '[slug].phtml'), '<h1>Post</h1>')
  writeFileSync(path.join(FIXTURES, 'blog', '[nopaths].js'),
    `export async function GET() { return {} }`)
  writeFileSync(path.join(FIXTURES, 'blog', '[nopaths].phtml'), '<h1>No paths</h1>')
})

afterAll(() => {
  rmSync(FIXTURES, { recursive: true, force: true })
})

test('patternToUrl substitutes a single param', () => {
  expect(patternToUrl('/blog/:slug', { slug: 'hello-world' })).toBe('/blog/hello-world')
})

test('patternToUrl substitutes multiple params', () => {
  expect(patternToUrl('/users/:id/posts/:postId', { id: '1', postId: '2' })).toBe('/users/1/posts/2')
})

test('patternToUrl returns pattern unchanged when no params', () => {
  expect(patternToUrl('/about', {})).toBe('/about')
})

test('urlToOutputPath maps / to index.html', () => {
  expect(urlToOutputPath('/', 'dist')).toBe(path.join('dist', 'index.html'))
})

test('urlToOutputPath maps /about to about/index.html', () => {
  expect(urlToOutputPath('/about', 'dist')).toBe(path.join('dist', 'about', 'index.html'))
})

test('urlToOutputPath maps /blog/hello-world to blog/hello-world/index.html', () => {
  expect(urlToOutputPath('/blog/hello-world', 'dist')).toBe(path.join('dist', 'blog', 'hello-world', 'index.html'))
})

test('enumerateUrls includes static routes', async () => {
  const { discoverRoutes } = await import('./router.js')
  const routes = await discoverRoutes(FIXTURES)
  const entries = await enumerateUrls(routes, FIXTURES)
  const urls = entries.map(e => e.url)
  expect(urls).toContain('/')
  expect(urls).toContain('/about')
  expect(urls).toContain('/blog')
})

test('enumerateUrls expands dynamic routes via staticPaths', async () => {
  const { discoverRoutes } = await import('./router.js')
  const routes = await discoverRoutes(FIXTURES)
  const entries = await enumerateUrls(routes, FIXTURES)
  const urls = entries.map(e => e.url)
  expect(urls).toContain('/blog/hello-world')
  expect(urls).toContain('/blog/second-post')
})

test('enumerateUrls skips dynamic routes without staticPaths', async () => {
  const { discoverRoutes } = await import('./router.js')
  const routes = await discoverRoutes(FIXTURES)
  const entries = await enumerateUrls(routes, FIXTURES)
  const urls = entries.map(e => e.url)
  expect(urls.some(u => u.includes(':nopaths'))).toBe(false)
})

test('copyPublicDir copies files from public/ into outDir', async () => {
  const pagesDir = path.join(FIXTURES, 'copy_public_test')
  const outDir = path.join(FIXTURES, 'copy_public_out')
  const publicDir = path.join(pagesDir, 'public')
  mkdirSync(publicDir, { recursive: true })
  writeFileSync(path.join(publicDir, 'style.css'), 'body {}')
  mkdirSync(path.join(publicDir, 'images'), { recursive: true })
  writeFileSync(path.join(publicDir, 'images', 'logo.png'), 'PNG')

  await copyPublicDir(pagesDir, outDir)

  expect(existsSync(path.join(outDir, 'style.css'))).toBe(true)
  expect(existsSync(path.join(outDir, 'images', 'logo.png'))).toBe(true)

  rmSync(pagesDir, { recursive: true, force: true })
  rmSync(outDir, { recursive: true, force: true })
})

test('rewriteBase rewrites href absolute paths', () => {
  const html = '<a href="/about">About</a>'
  expect(rewriteBase(html, '/chatopsjs/')).toBe('<a href="/chatopsjs/about">About</a>')
})

test('rewriteBase rewrites src absolute paths', () => {
  const html = '<img src="/assets/logo.png">'
  expect(rewriteBase(html, '/chatopsjs/')).toBe('<img src="/chatopsjs/assets/logo.png">')
})

test('rewriteBase rewrites action absolute paths', () => {
  const html = '<form action="/submit">'
  expect(rewriteBase(html, '/chatopsjs/')).toBe('<form action="/chatopsjs/submit">')
})

test('rewriteBase rewrites multiple occurrences', () => {
  const html = '<link href="/style.css"><script src="/app.js"></script>'
  expect(rewriteBase(html, '/sub/')).toBe('<link href="/sub/style.css"><script src="/sub/app.js"></script>')
})

test('rewriteBase returns html unchanged when base is falsy', () => {
  const html = '<a href="/about">About</a>'
  expect(rewriteBase(html, '')).toBe(html)
  expect(rewriteBase(html, null)).toBe(html)
  expect(rewriteBase(html, undefined)).toBe(html)
})

test('rewriteBase does not affect relative paths', () => {
  const html = '<a href="about">About</a><img src="assets/logo.png">'
  expect(rewriteBase(html, '/chatopsjs/')).toBe(html)
})

test('copyPublicDir does nothing when public/ directory does not exist', async () => {
  const pagesDir = path.join(FIXTURES, 'no_public_test')
  const outDir = path.join(FIXTURES, 'no_public_out')
  mkdirSync(pagesDir, { recursive: true })

  await expect(copyPublicDir(pagesDir, outDir)).resolves.toBeUndefined()

  rmSync(pagesDir, { recursive: true, force: true })
})
