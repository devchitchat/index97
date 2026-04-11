import { test, expect } from 'bun:test'
import { rewriteFormMethods, resolveMethod } from './forms.js'

test('rewriteFormMethods rewrites DELETE method to POST with hidden input', () => {
  const html = '<form method="DELETE" action="/tasks/1"><button>Delete</button></form>'
  const result = rewriteFormMethods(html)
  expect(result).toContain('method="POST"')
  expect(result).toContain('<input type="hidden" name="_method" value="DELETE">')
  expect(result).not.toContain('method="DELETE"')
})

test('rewriteFormMethods rewrites PUT method', () => {
  const html = '<form method="PUT" action="/tasks/1"></form>'
  const result = rewriteFormMethods(html)
  expect(result).toContain('method="POST"')
  expect(result).toContain('<input type="hidden" name="_method" value="PUT">')
})

test('rewriteFormMethods rewrites PATCH method', () => {
  const html = '<form method="PATCH" action="/tasks/1"></form>'
  const result = rewriteFormMethods(html)
  expect(result).toContain('<input type="hidden" name="_method" value="PATCH">')
})

test('rewriteFormMethods is case-insensitive for method attribute', () => {
  const html = '<form method="delete" action="/tasks/1"></form>'
  const result = rewriteFormMethods(html)
  expect(result).toContain('method="POST"')
  expect(result).toContain('<input type="hidden" name="_method" value="DELETE">')
})

test('rewriteFormMethods leaves GET forms unchanged', () => {
  const html = '<form method="GET" action="/search"></form>'
  expect(rewriteFormMethods(html)).toBe(html)
})

test('rewriteFormMethods leaves POST forms unchanged', () => {
  const html = '<form method="POST" action="/tasks"></form>'
  expect(rewriteFormMethods(html)).toBe(html)
})

test('rewriteFormMethods preserves other attributes on the form', () => {
  const html = '<form class="delete-form" method="DELETE" action="/tasks/1"></form>'
  const result = rewriteFormMethods(html)
  expect(result).toContain('class="delete-form"')
  expect(result).toContain('action="/tasks/1"')
})

test('resolveMethod returns original method for non-POST requests', async () => {
  const req = new Request('http://localhost/tasks', { method: 'GET' })
  const { method } = await resolveMethod(req)
  expect(method).toBe('GET')
})

test('resolveMethod returns POST when no _method field present', async () => {
  const req = new Request('http://localhost/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'title=Buy+milk'
  })
  const { method } = await resolveMethod(req)
  expect(method).toBe('POST')
})

test('resolveMethod returns a readable request when no override is present', async () => {
  const req = new Request('http://localhost/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'title=Buy+milk'
  })
  const { req: resolved } = await resolveMethod(req)
  const form = await resolved.formData()
  expect(form.get('title')).toBe('Buy milk')
})

test('resolveMethod overrides method from _method field', async () => {
  const req = new Request('http://localhost/tasks/1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: '_method=DELETE'
  })
  const { method } = await resolveMethod(req)
  expect(method).toBe('DELETE')
})

test('resolveMethod returns a new request with the overridden method', async () => {
  const req = new Request('http://localhost/tasks/1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: '_method=DELETE'
  })
  const { req: resolved } = await resolveMethod(req)
  expect(resolved.method).toBe('DELETE')
})

test('resolveMethod carries over params from the original request', async () => {
  const req = new Request('http://localhost/tasks/1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: '_method=PATCH'
  })
  req.params = { id: '1' }
  const { req: resolved } = await resolveMethod(req)
  expect(resolved.params).toEqual({ id: '1' })
})

test('resolveMethod preserves the body on the new request', async () => {
  const req = new Request('http://localhost/tasks/1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: '_method=DELETE&title=Buy+milk'
  })
  const { req: resolved } = await resolveMethod(req)
  const body = await resolved.text()
  expect(body).toContain('title=Buy+milk')
})

test('resolveMethod ignores unknown override methods', async () => {
  const req = new Request('http://localhost/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: '_method=DESTROY'
  })
  const { method } = await resolveMethod(req)
  expect(method).toBe('POST')
})
