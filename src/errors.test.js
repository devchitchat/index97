import { test, expect, beforeAll, afterAll } from 'bun:test'
import { findErrorPage, renderErrorPage, renderDefaultErrorPage } from './errors.js'
import path from 'node:path'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'

const FIXTURES = path.join(import.meta.dir, '__errors_fixtures__')

beforeAll(() => {
  mkdirSync(path.join(FIXTURES, 'blog'), { recursive: true })
  mkdirSync(path.join(FIXTURES, 'admin'), { recursive: true })
  writeFileSync(path.join(FIXTURES, '_404.html'), '<h1>404 - Not Found</h1>')
  writeFileSync(path.join(FIXTURES, '_error.html'), '<h1>{{status}} - {{title}}</h1><p>{{message}}</p>')
  writeFileSync(path.join(FIXTURES, 'blog', '_404.html'), '<h1>Blog 404</h1>')
  writeFileSync(path.join(FIXTURES, 'admin', '_error.html'), '<h1>Admin Error {{status}}</h1>')
})

afterAll(() => {
  rmSync(FIXTURES, { recursive: true, force: true })
})

test('findErrorPage finds _404.html for 404 status', async () => {
  const result = await findErrorPage(404, FIXTURES, FIXTURES)
  expect(result).toBe(path.join(FIXTURES, '_404.html'))
})

test('findErrorPage finds _error.html for 500 status', async () => {
  const result = await findErrorPage(500, FIXTURES, FIXTURES)
  expect(result).toBe(path.join(FIXTURES, '_error.html'))
})

test('findErrorPage finds _error.html for 503 status', async () => {
  const result = await findErrorPage(503, FIXTURES, FIXTURES)
  expect(result).toBe(path.join(FIXTURES, '_error.html'))
})

test('findErrorPage finds subdirectory _404.html before root', async () => {
  const result = await findErrorPage(404, path.join(FIXTURES, 'blog'), FIXTURES)
  expect(result).toBe(path.join(FIXTURES, 'blog', '_404.html'))
})

test('findErrorPage walks up to root _404.html when no subdirectory match', async () => {
  const result = await findErrorPage(404, path.join(FIXTURES, 'admin'), FIXTURES)
  expect(result).toBe(path.join(FIXTURES, '_404.html'))
})

test('findErrorPage finds subdirectory _error.html before root', async () => {
  const result = await findErrorPage(500, path.join(FIXTURES, 'admin'), FIXTURES)
  expect(result).toBe(path.join(FIXTURES, 'admin', '_error.html'))
})

test('findErrorPage walks up to root _error.html when no subdirectory match', async () => {
  const result = await findErrorPage(500, path.join(FIXTURES, 'blog'), FIXTURES)
  expect(result).toBe(path.join(FIXTURES, '_error.html'))
})

test('findErrorPage returns null when no error page exists', async () => {
  const result = await findErrorPage(404, FIXTURES, path.join(FIXTURES, 'blog'))
  expect(result).toBeNull()
})

test('renderErrorPage renders _404.html as plain html', async () => {
  const filePath = path.join(FIXTURES, '_404.html')
  const response = await renderErrorPage(filePath, 404)
  expect(response.status).toBe(404)
  expect(response.headers.get('Content-Type')).toContain('text/html')
  expect(await response.text()).toContain('404')
})

test('renderErrorPage injects status, title, message into _error.html', async () => {
  const filePath = path.join(FIXTURES, '_error.html')
  const response = await renderErrorPage(filePath, 500, 'Something broke')
  const body = await response.text()
  expect(response.status).toBe(500)
  expect(body).toContain('500')
  expect(body).toContain('Internal Server Error')
  expect(body).toContain('Something broke')
})

test('renderErrorPage sanitizes message in production', async () => {
  const filePath = path.join(FIXTURES, '_error.html')
  const response = await renderErrorPage(filePath, 500, 'DB password is abc123', false)
  const body = await response.text()
  expect(body).not.toContain('abc123')
  expect(body).toContain('An unexpected error occurred')
})

test('renderErrorPage renders correct title for 401', async () => {
  const filePath = path.join(FIXTURES, '_error.html')
  const response = await renderErrorPage(filePath, 401, 'Not signed in')
  const body = await response.text()
  expect(response.status).toBe(401)
  expect(body).toContain('401')
  expect(body).toContain('Unauthorized')
})

test('renderErrorPage renders correct title for 403', async () => {
  const filePath = path.join(FIXTURES, '_error.html')
  const response = await renderErrorPage(filePath, 403, '')
  const body = await response.text()
  expect(response.status).toBe(403)
  expect(body).toContain('Forbidden')
})

test('renderDefaultErrorPage returns 404 status with HTML content type', async () => {
  const response = renderDefaultErrorPage(404)
  expect(response.status).toBe(404)
  expect(response.headers.get('Content-Type')).toContain('text/html')
})

test('renderDefaultErrorPage includes status and title in body', async () => {
  const response = renderDefaultErrorPage(404)
  const body = await response.text()
  expect(body).toContain('404')
  expect(body).toContain('Not Found')
})

test('renderDefaultErrorPage works for 500', async () => {
  const response = renderDefaultErrorPage(500)
  const body = await response.text()
  expect(response.status).toBe(500)
  expect(body).toContain('500')
  expect(body).toContain('Internal Server Error')
})
