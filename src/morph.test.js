import { test, expect } from 'bun:test'
import { Window } from 'happy-dom'
import { morph, patchAttrs } from './morph.js'

function makeWindow(html = '') {
  const win = new Window()
  win.document.body.innerHTML = html
  return win.document
}

function makeContainer(win, html) {
  const div = win.createElement('div')
  div.innerHTML = html
  return div
}

test('morph updates a plain element attribute', () => {
  const doc = makeWindow('<p id="old">hello</p>')
  const container = makeContainer(doc, '<p id="new">hello</p>')
  morph(doc.body, container)
  expect(doc.querySelector('p').id).toBe('new')
})

test('morph updates text content inside an SVG element', () => {
  const doc = makeWindow('<svg><text x="10" y="20">before</text></svg>')
  const container = makeContainer(doc, '<svg><text x="10" y="20">after</text></svg>')
  morph(doc.body, container)
  expect(doc.querySelector('text').textContent).toBe('after')
})

test('morph does not throw when morphing SVG with attributes', () => {
  const doc = makeWindow('<svg viewBox="0 0 100 100" width="50"><circle cx="50" cy="50" r="40"/></svg>')
  const container = makeContainer(doc, '<svg viewBox="0 0 200 200" width="100"><circle cx="100" cy="100" r="80"/></svg>')
  expect(() => morph(doc.body, container)).not.toThrow()
  expect(doc.querySelector('svg').getAttribute('viewBox')).toBe('0 0 200 200')
})

test('patchAttrs does not throw when oldEl.attributes is null', () => {
  const fakeOld = { attributes: null, hasAttribute: () => false }
  const fakeNew = { attributes: null, getAttribute: () => null }
  expect(() => patchAttrs(fakeOld, fakeNew)).not.toThrow()
})

test('patchAttrs does not throw when newEl.attributes is null', () => {
  const doc = makeWindow('<div class="x"></div>')
  const realEl = doc.querySelector('div')
  const fakeNew = { attributes: null, hasAttribute: () => false, getAttribute: () => null }
  expect(() => patchAttrs(realEl, fakeNew)).not.toThrow()
})
