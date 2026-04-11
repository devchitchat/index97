import { test, expect } from 'bun:test'
import { parseArgs } from './cli.js'
import path from 'node:path'

test('parseArgs dev defaults to cwd and port 3000', () => {
  const result = parseArgs(['dev'])
  expect(result.command).toBe('dev')
  expect(result.dev).toBe(true)
  expect(result.port).toBe(3000)
  expect(result.pagesDir).toBe(process.cwd())
})

test('parseArgs start sets dev to false', () => {
  expect(parseArgs(['start']).dev).toBe(false)
})

test('parseArgs accepts a custom pages directory', () => {
  const result = parseArgs(['dev', './pages'])
  expect(result.pagesDir).toBe(path.resolve('./pages'))
})

test('parseArgs accepts --port flag', () => {
  expect(parseArgs(['dev', '--port', '8080']).port).toBe(8080)
})

test('parseArgs accepts pagesDir and --port together', () => {
  const result = parseArgs(['dev', './pages', '--port', '4000'])
  expect(result.pagesDir).toBe(path.resolve('./pages'))
  expect(result.port).toBe(4000)
})

test('parseArgs throws on unknown command', () => {
  expect(() => parseArgs(['unknown'])).toThrow()
})

test('parseArgs throws when no command given', () => {
  expect(() => parseArgs([])).toThrow()
})

test('parseArgs build defaults outDir to dist', () => {
  const result = parseArgs(['build'])
  expect(result.command).toBe('build')
  expect(result.outDir).toBe('dist')
})

test('parseArgs build accepts --out flag', () => {
  expect(parseArgs(['build', '--out', 'output']).outDir).toBe('output')
})

test('parseArgs build accepts pagesDir and --out together', () => {
  const result = parseArgs(['build', './pages', '--out', 'output'])
  expect(result.pagesDir).toBe(path.resolve('./pages'))
  expect(result.outDir).toBe('output')
})

test('parseArgs serve defaults to dist and port 3000', () => {
  const result = parseArgs(['serve'])
  expect(result.command).toBe('serve')
  expect(result.outDir).toBe('dist')
  expect(result.port).toBe(3000)
})

test('parseArgs serve accepts a custom dir', () => {
  const result = parseArgs(['serve', 'output'])
  expect(result.outDir).toBe('output')
})

test('parseArgs serve accepts --port', () => {
  expect(parseArgs(['serve', '--port', '9000']).port).toBe(9000)
})

test('parseArgs build accepts --path-prefix flag', () => {
  expect(parseArgs(['build', '--path-prefix', '/chatopsjs/']).pathPrefix).toBe('/chatopsjs/')
})

test('parseArgs build defaults pathPrefix to undefined', () => {
  expect(parseArgs(['build']).pathPrefix).toBeUndefined()
})
