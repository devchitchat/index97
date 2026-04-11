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

export function render(template, data = {}) {
  let result = template

  result = result.replace(/\{\{#each ([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, keyPath, inner) => {
    const arr = resolvePath(data, keyPath)
    if (!Array.isArray(arr)) return ''
    return arr.map(item => render(inner, item)).join('')
  })

  result = result.replace(/\{\{#if ([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, keyPath, inner) => {
    const value = resolvePath(data, keyPath)
    return value ? render(inner, data) : ''
  })

  result = result.replace(/\{\{#unless ([\w.]+)\}\}([\s\S]*?)\{\{\/unless\}\}/g, (_, keyPath, inner) => {
    const value = resolvePath(data, keyPath)
    return !value ? render(inner, data) : ''
  })

  result = result.replace(/\{\{!([\w.]+)\}\}/g, (_, keyPath) => {
    const value = resolvePath(data, keyPath)
    return String(!value)
  })

  result = result.replace(/\{\{\{([\w.]+)\}\}\}/g, (_, keyPath) => {
    const value = resolvePath(data, keyPath)
    return value !== undefined && value !== null ? String(value) : ''
  })

  result = result.replace(/\{\{([\w.]+)\}\}/g, (_, keyPath) => {
    const value = resolvePath(data, keyPath)
    return value !== undefined && value !== null ? escapeHtml(value) : ''
  })

  return result
}
