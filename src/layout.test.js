import { test, expect, beforeAll, afterAll } from 'bun:test'
import { findLayout, findLayoutData, applyLayout } from './layout.js'
import path from 'node:path'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'

const FIXTURES = path.join(import.meta.dir, '__layout_fixtures__')

beforeAll(() => {
  mkdirSync(path.join(FIXTURES, 'blog'), { recursive: true })
  writeFileSync(path.join(FIXTURES, '_layout.html'), '<main>{{content}}</main>')
  writeFileSync(path.join(FIXTURES, '_layout.js'), 'export function data(req) { return {} }')
  writeFileSync(path.join(FIXTURES, 'index.html'), '<h1>Home</h1>')
  writeFileSync(path.join(FIXTURES, 'about.html'), '<h1>About</h1>')
  writeFileSync(path.join(FIXTURES, 'blog', 'index.html'), '<h1>Blog</h1>')
})

afterAll(() => {
  rmSync(FIXTURES, { recursive: true, force: true })
})

test('findLayout finds _layout.html in the same directory', async () => {
  const layout = await findLayout(path.join(FIXTURES, 'about.html'), FIXTURES)
  expect(layout).toBe(path.join(FIXTURES, '_layout.html'))
})

test('findLayout finds _layout.html walking up from a subdirectory', async () => {
  const layout = await findLayout(path.join(FIXTURES, 'blog', 'index.html'), FIXTURES)
  expect(layout).toBe(path.join(FIXTURES, '_layout.html'))
})

test('findLayout returns null when no _layout.html exists', async () => {
  const layout = await findLayout(path.join(FIXTURES, 'blog', 'index.html'), path.join(FIXTURES, 'blog'))
  expect(layout).toBeNull()
})

test('applyLayout injects page content into {{content}} placeholder', () => {
  const result = applyLayout('<h1>Hello</h1>', '<main>{{content}}</main>')
  expect(result).toBe('<main><h1>Hello</h1></main>')
})

test('applyLayout does not escape HTML in content', () => {
  const result = applyLayout('<p class="foo">Bar</p>', '<main>{{content}}</main>')
  expect(result).toBe('<main><p class="foo">Bar</p></main>')
})

test('applyLayout extracts named slot and injects into layout placeholder', () => {
  const page = `<template data-slot="title">About Us</template>\n<h1>About</h1>`
  const layout = `<title>{{slot:title}}</title><main>{{content}}</main>`
  const result = applyLayout(page, layout)
  expect(result).toBe('<title>About Us</title><main><h1>About</h1></main>')
})

test('applyLayout strips slot declarations from {{content}}', () => {
  const page = `<template data-slot="title">My Page</template>\n<h1>Hello</h1>`
  const layout = `<title>{{slot:title}}</title><main>{{content}}</main>`
  const result = applyLayout(page, layout)
  expect(result).not.toContain('data-slot')
  expect(result).not.toContain('<template')
})

test('applyLayout handles multiple named slots', () => {
  const page = [
    '<template data-slot="title">Blog Post</template>',
    '<template data-slot="head"><meta name="description" content="A post"></template>',
    '<h1>Blog Post</h1>'
  ].join('\n')
  const layout = `<title>{{slot:title}}</title>{{slot:head}}<main>{{content}}</main>`
  const result = applyLayout(page, layout)
  expect(result).toContain('<title>Blog Post</title>')
  expect(result).toContain('<meta name="description" content="A post">')
  expect(result).toContain('<main><h1>Blog Post</h1></main>')
})

test('applyLayout clears unused slot placeholders in layout', () => {
  const page = `<h1>Hello</h1>`
  const layout = `<title>{{slot:title}}</title><main>{{content}}</main>`
  const result = applyLayout(page, layout)
  expect(result).toBe('<title></title><main><h1>Hello</h1></main>')
})

test('applyLayout uses default value when slot is not provided by page', () => {
  const page = `<h1>Hello</h1>`
  const layout = `<title>{{slot:title || index97}}</title><main>{{content}}</main>`
  const result = applyLayout(page, layout)
  expect(result).toBe('<title>index97</title><main><h1>Hello</h1></main>')
})

test('applyLayout prefers page slot value over default', () => {
  const page = `<template data-slot="title">About Us</template>\n<h1>About</h1>`
  const layout = `<title>{{slot:title || index97}}</title><main>{{content}}</main>`
  const result = applyLayout(page, layout)
  expect(result).toBe('<title>About Us</title><main><h1>About</h1></main>')
})

test('findLayoutData returns path to _layout.js when it exists alongside _layout.html', async () => {
  const result = await findLayoutData(path.join(FIXTURES, '_layout.html'))
  expect(result).toBe(path.join(FIXTURES, '_layout.js'))
})

test('findLayoutData returns null when no _layout.js exists', async () => {
  const result = await findLayoutData(path.join(FIXTURES, 'blog', '_layout.html'))
  expect(result).toBeNull()
})
