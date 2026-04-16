const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ESCAPE_MAP[c])
}

function resolvePath(data, keyPath) {
  return keyPath.split('.').reduce((obj, key) => obj?.[key], data)
}

function resolveWithChain(chain, keyPath) {
  for (let i = chain.length - 1; i >= 0; i--) {
    const val = resolvePath(chain[i], keyPath)
    if (val !== undefined && val !== null) return val
  }
  return undefined
}

function processEach(template, scope) {
  const OPEN = '{{#each '
  const CLOSE = '{{/each}}'

  let result = ''
  let pos = 0

  while (pos < template.length) {
    const openIdx = template.indexOf(OPEN, pos)
    if (openIdx === -1) {
      result += template.slice(pos)
      break
    }

    result += template.slice(pos, openIdx)

    const tagEnd = template.indexOf('}}', openIdx + OPEN.length)
    if (tagEnd === -1) {
      result += template.slice(openIdx)
      break
    }

    const keyPath = template.slice(openIdx + OPEN.length, tagEnd).trim()
    const bodyStart = tagEnd + 2

    // Find matching {{/each}} tracking nesting depth
    let depth = 1
    let searchPos = bodyStart
    let matchEnd = -1

    while (searchPos < template.length) {
      const nextOpen = template.indexOf(OPEN, searchPos)
      const nextClose = template.indexOf(CLOSE, searchPos)

      if (nextClose === -1) break

      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++
        searchPos = nextOpen + OPEN.length
      } else {
        depth--
        if (depth === 0) {
          matchEnd = nextClose
          break
        }
        searchPos = nextClose + CLOSE.length
      }
    }

    if (matchEnd === -1) {
      result += template.slice(openIdx, bodyStart)
      pos = bodyStart
      continue
    }

    const inner = template.slice(bodyStart, matchEnd)
    const arr = resolveWithChain(scope, keyPath)

    if (Array.isArray(arr)) {
      result += arr.map(item => renderWithChain(inner, item, scope)).join('')
    }

    pos = matchEnd + CLOSE.length
  }

  return result
}

function renderWithChain(template, data, chain) {
  const scope = [...chain, data]
  let result = processEach(template, scope)

  result = result.replace(/\{\{#if ([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, keyPath, inner) => {
    const value = resolveWithChain(scope, keyPath)
    return value ? renderWithChain(inner, data, chain) : ''
  })

  result = result.replace(/\{\{#unless ([\w.]+)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (_, keyPath, inner) => {
    const value = resolveWithChain(scope, keyPath)
    return !value ? renderWithChain(inner, data, chain) : ''
  })

  result = result.replace(/\{\{!([\w.]+)\}\}/g, (_, keyPath) => {
    const value = resolveWithChain(scope, keyPath)
    return String(!value)
  })

  result = result.replace(/\{\{\{([\w.]+)\}\}\}/g, (_, keyPath) => {
    const value = resolveWithChain(scope, keyPath)
    return value !== undefined && value !== null ? String(value) : ''
  })

  result = result.replace(/\{\{([\w.]+)\}\}/g, (_, keyPath) => {
    const value = resolveWithChain(scope, keyPath)
    return value !== undefined && value !== null ? escapeHtml(value) : ''
  })

  return result
}

export function render(template, data = {}) {
  return renderWithChain(template, data, [])
}
