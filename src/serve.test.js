import { test, expect, beforeAll, afterAll } from 'bun:test'
import { serveStatic } from './serve.js'
import path from 'node:path'
import { mkdirSync, rmSync } from 'node:fs'

const FIXTURES = path.join(import.meta.dir, '__serve_fixtures__')

beforeAll(async () => {
  mkdirSync(path.join(FIXTURES, 'blog', 'hello-world'), { recursive: true })
  await Bun.write(path.join(FIXTURES, 'index.html'), '<h1>Home</h1>')
  await Bun.write(path.join(FIXTURES, 'about', 'index.html'), '<h1>About</h1>')
  mkdirSync(path.join(FIXTURES, 'about'), { recursive: true })
  await Bun.write(path.join(FIXTURES, 'about', 'index.html'), '<h1>About</h1>')
  await Bun.write(path.join(FIXTURES, 'blog', 'hello-world', 'index.html'), '<h1>Post</h1>')
  await Bun.write(path.join(FIXTURES, 'style.css'), 'body { color: red }')
})

afterAll(() => {
  rmSync(FIXTURES, { recursive: true, force: true })
})

test('serveStatic serves / as index.html', async () => {
  const server = await serveStatic({ dir: FIXTURES, port: 0 })
  const res = await fetch(`http://localhost:${server.port}/`)
  expect(res.status).toBe(200)
  expect(await res.text()).toBe('<h1>Home</h1>')
  server.stop()
})

test('serveStatic serves /about as about/index.html', async () => {
  const server = await serveStatic({ dir: FIXTURES, port: 0 })
  const res = await fetch(`http://localhost:${server.port}/about`)
  expect(res.status).toBe(200)
  expect(await res.text()).toBe('<h1>About</h1>')
  server.stop()
})

test('serveStatic serves /blog/hello-world as blog/hello-world/index.html', async () => {
  const server = await serveStatic({ dir: FIXTURES, port: 0 })
  const res = await fetch(`http://localhost:${server.port}/blog/hello-world`)
  expect(res.status).toBe(200)
  expect(await res.text()).toBe('<h1>Post</h1>')
  server.stop()
})

test('serveStatic serves static assets directly', async () => {
  const server = await serveStatic({ dir: FIXTURES, port: 0 })
  const res = await fetch(`http://localhost:${server.port}/style.css`)
  expect(res.status).toBe(200)
  expect(res.headers.get('Content-Type')).toContain('text/css')
  server.stop()
})

test('serveStatic returns 404 for unknown paths', async () => {
  const server = await serveStatic({ dir: FIXTURES, port: 0 })
  const res = await fetch(`http://localhost:${server.port}/not-found`)
  expect(res.status).toBe(404)
  server.stop()
})
