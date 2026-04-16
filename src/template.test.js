import { test, expect } from 'bun:test'
import { render, escapeHtml } from './template.js'

test('escapeHtml escapes ampersand', () => {
  expect(escapeHtml('a & b')).toBe('a &amp; b')
})

test('escapeHtml escapes angle brackets', () => {
  expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
})

test('escapeHtml escapes double quotes', () => {
  expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;')
})

test('escapeHtml escapes single quotes', () => {
  expect(escapeHtml("it's")).toBe("it&#39;s")
})

test('render replaces {{variable}} with data value', () => {
  expect(render('<h1>{{title}}</h1>', { title: 'Hello' })).toBe('<h1>Hello</h1>')
})

test('render resolves dot-notation key paths', () => {
  expect(render('{{post.title}}', { post: { title: 'My Post' } })).toBe('My Post')
})

test('render escapes HTML entities in values to prevent XSS', () => {
  expect(render('<p>{{body}}</p>', { body: '<script>alert(1)</script>' }))
    .toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')
})

test('render replaces with empty string when key is missing', () => {
  expect(render('<p>{{missing}}</p>', {})).toBe('<p></p>')
})

test('render replaces multiple variables', () => {
  expect(render('{{a}} {{b}}', { a: 'foo', b: 'bar' })).toBe('foo bar')
})

test('render leaves template unchanged when no placeholders', () => {
  expect(render('<p>Hello</p>', {})).toBe('<p>Hello</p>')
})

test('render loops over array with {{#each}}', () => {
  const tmpl = '{{#each items}}<li>{{name}}</li>{{/each}}'
  expect(render(tmpl, { items: [{ name: 'Buy milk' }, { name: 'Walk dog' }] }))
    .toBe('<li>Buy milk</li><li>Walk dog</li>')
})

test('render outputs nothing for empty array in {{#each}}', () => {
  expect(render('{{#each items}}<li>{{name}}</li>{{/each}}', { items: [] })).toBe('')
})

test('render outputs nothing when {{#each}} key is missing', () => {
  expect(render('{{#each items}}<li>{{name}}</li>{{/each}}', {})).toBe('')
})

test('render shows block when {{#if}} value is truthy', () => {
  expect(render('{{#if done}}<span>Done</span>{{/if}}', { done: true })).toBe('<span>Done</span>')
})

test('render hides block when {{#if}} value is falsy', () => {
  expect(render('{{#if done}}<span>Done</span>{{/if}}', { done: false })).toBe('')
})

test('render evaluates variables inside {{#if}} block', () => {
  expect(render('{{#if show}}<p>{{message}}</p>{{/if}}', { show: true, message: 'Hello' }))
    .toBe('<p>Hello</p>')
})

test('render escapes HTML in values inside {{#each}} block', () => {
  expect(render('{{#each items}}<li>{{label}}</li>{{/each}}', { items: [{ label: '<b>bold</b>' }] }))
    .toBe('<li>&lt;b&gt;bold&lt;/b&gt;</li>')
})

test('render shows block when {{#unless}} value is falsy', () => {
  expect(render('{{#unless done}}<span>Pending</span>{{/unless}}', { done: false })).toBe('<span>Pending</span>')
})

test('render hides block when {{#unless}} value is truthy', () => {
  expect(render('{{#unless done}}<span>Pending</span>{{/unless}}', { done: true })).toBe('')
})

test('render evaluates variables inside {{#unless}} block', () => {
  expect(render('{{#unless hide}}<p>{{message}}</p>{{/unless}}', { hide: false, message: 'Hello' }))
    .toBe('<p>Hello</p>')
})

test('render outputs "false" for {{!variable}} when value is truthy', () => {
  expect(render('<div aria-expanded="{{!isOpen}}"></div>', { isOpen: true }))
    .toBe('<div aria-expanded="false"></div>')
})

test('render outputs "true" for {{!variable}} when value is falsy', () => {
  expect(render('<div aria-expanded="{{!isOpen}}"></div>', { isOpen: false }))
    .toBe('<div aria-expanded="true"></div>')
})

test('render outputs "true" for {{!variable}} when key is missing', () => {
  expect(render('{{!missing}}', {})).toBe('true')
})

test('render outputs raw HTML without escaping for {{{variable}}}', () => {
  expect(render('<div>{{{body}}}</div>', { body: '<p>Hello <strong>world</strong></p>' }))
    .toBe('<div><p>Hello <strong>world</strong></p></div>')
})

test('render escapes {{variable}} but not {{{variable}}}', () => {
  const data = { safe: '<b>bold</b>' }
  expect(render('{{safe}}', data)).toBe('&lt;b&gt;bold&lt;/b&gt;')
  expect(render('{{{safe}}}', data)).toBe('<b>bold</b>')
})

test('render outputs empty string for missing {{{variable}}}', () => {
  expect(render('{{{missing}}}', {})).toBe('')
})

test('render supports nested {{#each}} blocks', () => {
  const tmpl = '{{#each categories}}{{#each items}}{{name}} {{/each}}{{/each}}'
  const data = {
    categories: [
      { items: [{ name: 'a' }, { name: 'b' }] },
      { items: [{ name: 'c' }] }
    ]
  }
  expect(render(tmpl, data)).toBe('a b c ')
})

test('render accesses outer scope variable from inside nested {{#each}}', () => {
  const tmpl = '{{#each categories}}{{#each items}}{{catName}}:{{name}} {{/each}}{{/each}}'
  const data = {
    categories: [
      { catName: 'A', items: [{ name: 'x' }, { name: 'y' }] },
      { catName: 'B', items: [{ name: 'z' }] }
    ]
  }
  expect(render(tmpl, data)).toBe('A:x A:y B:z ')
})

test('render inner {{#each}} variable shadows outer variable with same name', () => {
  const tmpl = '{{#each outer}}{{#each inner}}{{name}} {{/each}}{{/each}}'
  const data = {
    outer: [
      { name: 'outer1', inner: [{ name: 'inner1' }, { name: 'inner2' }] }
    ]
  }
  expect(render(tmpl, data)).toBe('inner1 inner2 ')
})

test('render accesses root scope variable from deeply nested {{#each}}', () => {
  const tmpl = '{{#each groups}}{{#each members}}{{title}} {{/each}}{{/each}}'
  const data = {
    title: 'Report',
    groups: [
      { members: [{ name: 'Alice' }, { name: 'Bob' }] }
    ]
  }
  expect(render(tmpl, data)).toBe('Report Report ')
})
