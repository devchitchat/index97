import path from 'node:path'
import { render } from './template.js'

function parseAttrs(attrsStr) {
  const attrs = {}
  const re = /([\w-]+)="([^"]*)"/g
  let m
  while ((m = re.exec(attrsStr)) !== null) {
    attrs[m[1]] = m[2]
  }
  return attrs
}

function resolveAttrValue(value, data) {
  if (value.startsWith('@')) {
    const keyPath = value.slice(1)
    return keyPath.split('.').reduce((obj, key) => obj?.[key], data)
  }
  return value
}

function buildPartialContext(attrs, parentData) {
  const hasAtKeys = Object.values(attrs).some(v => v.startsWith('@'))
  const hasLiterals = Object.keys(attrs).length > 0

  if (!hasLiterals) return parentData

  const ctx = {}
  for (const [key, value] of Object.entries(attrs)) {
    ctx[key] = resolveAttrValue(value, parentData)
  }

  if (!hasAtKeys) return { ...parentData, ...ctx }
  return ctx
}

export async function resolveIncludes(html, data, pagesDir) {
  const includeRe = /<include\s+src="([^"]+)"([^>]*)>/g
  const matches = [...html.matchAll(includeRe)]
  if (matches.length === 0) return html

  let result = html
  const resolvedBase = path.resolve(pagesDir)
  for (const match of matches) {
    const [full, src, attrsStr] = match
    const filePath = path.join(pagesDir, src)
    const resolvedPath = path.resolve(filePath)
    if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
      result = result.replace(full, '')
      continue
    }
    const file = Bun.file(filePath)
    if (!await file.exists()) {
      result = result.replace(full, '')
      continue
    }
    const template = await file.text()
    const attrs = parseAttrs(attrsStr)
    const ctx = buildPartialContext(attrs, data)
    const rendered = render(template, ctx)
    result = result.replace(full, rendered)
  }

  return result
}
