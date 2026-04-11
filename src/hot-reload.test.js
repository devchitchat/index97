import { test, expect } from 'bun:test'
import { injectHmrScript, HMR_SCRIPT, createSseResponse, notifyClients } from './hot-reload.js'

test('injectHmrScript inserts script before </body>', () => {
  const html = '<html><body><p>Hello</p></body></html>'
  const result = injectHmrScript(html)
  expect(result).toContain(HMR_SCRIPT + '</body>')
  expect(result.indexOf(HMR_SCRIPT)).toBeLessThan(result.indexOf('</body>'))
})

test('injectHmrScript appends script when no </body> tag', () => {
  const html = '<p>partial</p>'
  const result = injectHmrScript(html)
  expect(result).toBe(html + HMR_SCRIPT)
})

test('injectHmrScript does not inject twice', () => {
  const html = '<html><body></body></html>'
  const once = injectHmrScript(html)
  const count = (once.match(/<script\b/g) || []).length
  expect(count).toBe(1)
})

test('createSseResponse returns a Response with SSE headers', () => {
  const res = createSseResponse()
  expect(res).toBeInstanceOf(Response)
  expect(res.headers.get('Content-Type')).toBe('text/event-stream')
  expect(res.headers.get('Cache-Control')).toBe('no-cache')
})

test('notifyClients sends a reload event for non-CSS files', async () => {
  const res = createSseResponse()
  notifyClients('about.html')
  const reader = res.body.getReader()
  const { value } = await reader.read()
  expect(new TextDecoder().decode(value)).toBe('data: {"type":"reload","file":"about.html"}\n\n')
  reader.cancel()
})

test('notifyClients sends a css event for .css files', async () => {
  const res = createSseResponse()
  notifyClients('style.css')
  const reader = res.body.getReader()
  const { value } = await reader.read()
  expect(new TextDecoder().decode(value)).toBe('data: {"type":"css","file":"style.css"}\n\n')
  reader.cancel()
})
