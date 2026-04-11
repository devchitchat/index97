import { test, expect, beforeAll, afterAll } from 'bun:test'
import { dispatch } from './handler.js'
import path from 'node:path'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'

const FIXTURES = path.join(import.meta.dir, '__handler_fixtures__')
const TEMPLATE_PATH = path.join(FIXTURES, 'post.html')

beforeAll(() => {
  mkdirSync(FIXTURES, { recursive: true })
  writeFileSync(TEMPLATE_PATH, '<h1>{{post.title}}</h1>')
})

afterAll(() => {
  rmSync(FIXTURES, { recursive: true, force: true })
})

test('dispatch passes through a Response returned by handler', async () => {
  const handler = async () => new Response('custom', { status: 201 })
  const { response } = await dispatch(handler, new Request('http://localhost/'), {})
  expect(response.status).toBe(201)
  expect(await response.text()).toBe('custom')
})

test('dispatch wraps a string return value as HTML response', async () => {
  const handler = async () => '<p>hello</p>'
  const { response } = await dispatch(handler, new Request('http://localhost/'), {})
  expect(response.headers.get('Content-Type')).toContain('text/html')
  expect(await response.text()).toBe('<p>hello</p>')
})

test('dispatch renders sibling template with object return value', async () => {
  const handler = async () => ({ post: { title: 'Hello World' } })
  const route = { template: TEMPLATE_PATH }
  const { response } = await dispatch(handler, new Request('http://localhost/'), route)
  expect(response.headers.get('Content-Type')).toContain('text/html')
  expect(await response.text()).toBe('<h1>Hello World</h1>')
})

test('dispatch returns data alongside response for object return values', async () => {
  const handler = async () => ({ post: { title: 'Hello World' } })
  const route = { template: TEMPLATE_PATH }
  const { data } = await dispatch(handler, new Request('http://localhost/'), route)
  expect(data).toEqual({ post: { title: 'Hello World' } })
})

test('dispatch returns empty data for non-object handler returns', async () => {
  const handler = async () => '<p>hello</p>'
  const { data } = await dispatch(handler, new Request('http://localhost/'), {})
  expect(data).toEqual({})
})

test('dispatch returns 500 when object returned but no template exists', async () => {
  const handler = async () => ({ data: 'foo' })
  const { response } = await dispatch(handler, new Request('http://localhost/'), {})
  expect(response.status).toBe(500)
})

test('dispatch passes through a redirect response from handler', async () => {
  const handler = async () => Response.redirect('http://localhost/tasks', 303)
  const { response } = await dispatch(handler, new Request('http://localhost/'), {})
  expect(response.status).toBe(303)
  expect(response.headers.get('Location')).toBe('http://localhost/tasks')
})

test('dispatch passes req so handler can read form data', async () => {
  const handler = async (req) => {
    const form = await req.formData()
    return `<p>${form.get('title')}</p>`
  }
  const body = new URLSearchParams({ title: 'Buy milk' })
  const req = new Request('http://localhost/tasks', { method: 'POST', body })
  const { response } = await dispatch(handler, req, {})
  expect(await response.text()).toBe('<p>Buy milk</p>')
})
