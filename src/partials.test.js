import { test, expect, beforeAll, afterAll } from 'bun:test'
import { resolveIncludes } from './partials.js'
import path from 'node:path'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'

const FIXTURES = path.join(import.meta.dir, '__partials_fixtures__')

beforeAll(() => {
  mkdirSync(path.join(FIXTURES, 'components'), { recursive: true })
  writeFileSync(path.join(FIXTURES, 'user-card.phtml'), '<div class="card"><h2>{{name}}</h2><span>{{role}}</span></div>')
  writeFileSync(path.join(FIXTURES, 'greeting.phtml'), '<p>Hello, {{name}}!</p>')
  writeFileSync(path.join(FIXTURES, 'task-list.phtml'), '{{#each tasks}}<li>{{title}}</li>{{/each}}')
  writeFileSync(path.join(FIXTURES, 'components', 'badge.phtml'), '<span class="badge">{{label}}</span>')
})

afterAll(() => {
  rmSync(FIXTURES, { recursive: true, force: true })
})

test('resolveIncludes replaces <include> with rendered partial content', async () => {
  const html = '<include src="greeting.phtml">'
  const result = await resolveIncludes(html, { name: 'Joey' }, FIXTURES)
  expect(result).toBe('<p>Hello, Joey!</p>')
})

test('resolveIncludes inherits full parent context when no attributes', async () => {
  const html = '<include src="user-card.phtml">'
  const result = await resolveIncludes(html, { name: 'Joey', role: 'admin' }, FIXTURES)
  expect(result).toContain('Joey')
  expect(result).toContain('admin')
})

test('resolveIncludes passes @key slice from parent data', async () => {
  const html = '<include src="user-card.phtml" name="@author.name" role="@author.role">'
  const data = { author: { name: 'Joey', role: 'admin' }, other: 'ignored' }
  const result = await resolveIncludes(html, data, FIXTURES)
  expect(result).toContain('Joey')
  expect(result).toContain('admin')
  expect(result).not.toContain('ignored')
})

test('resolveIncludes passes literal string attributes', async () => {
  const html = '<include src="user-card.phtml" name="Joey" role="admin">'
  const result = await resolveIncludes(html, {}, FIXTURES)
  expect(result).toContain('Joey')
  expect(result).toContain('admin')
})

test('resolveIncludes mixes @key and literal attributes', async () => {
  const html = '<include src="user-card.phtml" name="@user.name" role="guest">'
  const result = await resolveIncludes(html, { user: { name: 'Joey' } }, FIXTURES)
  expect(result).toContain('Joey')
  expect(result).toContain('guest')
})

test('resolveIncludes passes array via @key to partial', async () => {
  const html = '<include src="task-list.phtml" tasks="@items">'
  const result = await resolveIncludes(html, { items: [{ title: 'Buy milk' }, { title: 'Walk dog' }] }, FIXTURES)
  expect(result).toContain('<li>Buy milk</li>')
  expect(result).toContain('<li>Walk dog</li>')
})

test('resolveIncludes resolves partial from subdirectory', async () => {
  const html = '<include src="components/badge.phtml" label="New">'
  const result = await resolveIncludes(html, {}, FIXTURES)
  expect(result).toBe('<span class="badge">New</span>')
})

test('resolveIncludes handles multiple includes in one template', async () => {
  const html = '<include src="greeting.phtml" name="Joey"><include src="greeting.phtml" name="Alice">'
  const result = await resolveIncludes(html, {}, FIXTURES)
  expect(result).toContain('Hello, Joey!')
  expect(result).toContain('Hello, Alice!')
})

test('resolveIncludes returns empty string for missing partial file', async () => {
  const html = '<include src="nonexistent.phtml">'
  const result = await resolveIncludes(html, {}, FIXTURES)
  expect(result).toBe('')
})

test('resolveIncludes blocks path traversal above pagesDir', async () => {
  const html = '<include src="../../etc/passwd">'
  const result = await resolveIncludes(html, {}, FIXTURES)
  expect(result).toBe('')
})

test('resolveIncludes blocks traversal with encoded sequences', async () => {
  const html = '<include src="../partials.test.js">'
  const result = await resolveIncludes(html, {}, FIXTURES)
  expect(result).toBe('')
})
