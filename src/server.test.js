import { test, expect, beforeAll, afterAll } from 'bun:test'
import { createServer } from './server.js'
import path from 'node:path'
import { mkdirSync, rmSync } from 'node:fs'

const FIXTURES = path.join(import.meta.dir, '__server_fixtures__')

beforeAll(async () => {
  mkdirSync(FIXTURES, { recursive: true })
  await Bun.write(path.join(FIXTURES, 'index.html'), '<h1>Home</h1>')
})

afterAll(() => {
  rmSync(FIXTURES, { recursive: true, force: true })
})

test('createServer serves a discovered page route', async () => {
  const server = await createServer({ pagesDir: FIXTURES, port: 0, dev: false })
  const res = await fetch(`http://localhost:${server.port}/`)
  expect(res.status).toBe(200)
  expect(await res.text()).toContain('<h1>Home</h1>')
  server.stop()
})

test('createServer merges extra routes with discovered page routes', async () => {
  const server = await createServer({
    pagesDir: FIXTURES,
    port: 0,
    dev: false,
    routes: {
      '/api/ping': () => new Response(JSON.stringify({ pong: true }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
  })

  const api = await fetch(`http://localhost:${server.port}/api/ping`)
  expect(api.status).toBe(200)
  expect(await api.json()).toEqual({ pong: true })

  // discovered page route still works
  const page = await fetch(`http://localhost:${server.port}/`)
  expect(page.status).toBe(200)

  server.stop()
})

test('discovered page routes take precedence over extra routes on collision', async () => {
  const server = await createServer({
    pagesDir: FIXTURES,
    port: 0,
    dev: false,
    routes: {
      '/': () => new Response('<h1>Overridden</h1>', { headers: { 'Content-Type': 'text/html' } })
    }
  })

  const res = await fetch(`http://localhost:${server.port}/`)
  expect(await res.text()).toContain('<h1>Home</h1>')

  server.stop()
})

test('createServer passes websocket option through to Bun.serve', async () => {
  const received = []

  const server = await createServer({
    pagesDir: FIXTURES,
    port: 0,
    dev: false,
    routes: {
      '/ws': (req, server) => {
        if (server.upgrade(req)) return
        return new Response('upgrade required', { status: 426 })
      }
    },
    websocket: {
      message(ws, msg) {
        received.push(msg)
        ws.send('echo:' + msg)
      }
    }
  })

  const ws = new WebSocket(`ws://localhost:${server.port}/ws`)
  await new Promise(resolve => ws.addEventListener('open', resolve))

  const reply = new Promise(resolve => ws.addEventListener('message', e => resolve(e.data)))
  ws.send('hello')

  expect(await reply).toBe('echo:hello')
  expect(received).toContain('hello')

  ws.close()
  server.stop()
})

test('createServer passes other Bun.serve options through (hostname)', async () => {
  const server = await createServer({
    pagesDir: FIXTURES,
    port: 0,
    dev: false,
    hostname: '127.0.0.1',
  })

  const res = await fetch(`http://127.0.0.1:${server.port}/`)
  expect(res.status).toBe(200)

  server.stop()
})

test('createServer returns HTML 404 page by default when no _404.html exists', async () => {
  const server = await createServer({ pagesDir: FIXTURES, port: 0, dev: false })
  const res = await fetch(`http://localhost:${server.port}/does-not-exist`)
  expect(res.status).toBe(404)
  expect(res.headers.get('Content-Type')).toContain('text/html')
  const body = await res.text()
  expect(body).toContain('404')
  server.stop()
})

test('createServer uses notFoundPage option when provided', async () => {
  const customPage = path.join(FIXTURES, 'custom-404.html')
  await Bun.write(customPage, '<h1>Custom 404 page</h1>')
  const server = await createServer({ pagesDir: FIXTURES, port: 0, dev: false, notFoundPage: customPage })
  const res = await fetch(`http://localhost:${server.port}/does-not-exist`)
  expect(res.status).toBe(404)
  expect(res.headers.get('Content-Type')).toContain('text/html')
  expect(await res.text()).toContain('Custom 404 page')
  server.stop()
})
