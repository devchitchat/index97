import { test, expect } from 'bun:test'
import { parseFrontMatter, renderMarkdown } from './markdown.js'

test('parseFrontMatter returns empty data and full content when no front matter', () => {
  const src = '# Hello\n\nWorld'
  const { data, content } = parseFrontMatter(src)
  expect(data).toEqual({})
  expect(content).toBe('# Hello\n\nWorld')
})

test('parseFrontMatter extracts key-value pairs from front matter block', () => {
  const src = '---\ntitle: Hello World\ndescription: A post\n---\n\n# Hello'
  const { data } = parseFrontMatter(src)
  expect(data.title).toBe('Hello World')
  expect(data.description).toBe('A post')
})

test('parseFrontMatter returns content without the front matter block', () => {
  const src = '---\ntitle: Hello\n---\n\n# Hello\n\nContent here.'
  const { content } = parseFrontMatter(src)
  expect(content).toBe('# Hello\n\nContent here.')
  expect(content).not.toContain('---')
})

test('parseFrontMatter handles missing closing delimiter gracefully', () => {
  const src = '---\ntitle: Hello\n\n# No closing delimiter'
  const { data, content } = parseFrontMatter(src)
  expect(data).toEqual({})
  expect(content).toBe(src)
})

test('parseFrontMatter parses numeric values as numbers', () => {
  const src = '---\norder: 1\n---\n\nContent'
  const { data } = parseFrontMatter(src)
  expect(data.order).toBe(1)
})

test('renderMarkdown returns html string from markdown', () => {
  const { html } = renderMarkdown('# Hello')
  expect(html).toContain('<h1>')
  expect(html).toContain('Hello')
})

test('renderMarkdown extracts front matter data', () => {
  const src = '---\ntitle: My Page\n---\n\n# My Page'
  const { data } = renderMarkdown(src)
  expect(data.title).toBe('My Page')
})

test('renderMarkdown does not include front matter in html output', () => {
  const src = '---\ntitle: My Page\n---\n\n# My Page'
  const { html } = renderMarkdown(src)
  expect(html).not.toContain('title: My Page')
  expect(html).not.toContain('---')
})

test('renderMarkdown renders GFM task lists', () => {
  const src = '- [x] Done\n- [ ] Not done'
  const { html } = renderMarkdown(src)
  expect(html).toContain('checked')
})
