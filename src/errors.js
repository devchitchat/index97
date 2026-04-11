import path from 'node:path'
import { render } from './template.js'

const STATUS_TITLES = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
}

function errorFilename(status) {
  return status === 404 ? '_404.html' : '_error.html'
}

export async function findErrorPage(status, dir, pagesDir) {
  let current = dir
  while (current.startsWith(pagesDir)) {
    const candidate = path.join(current, errorFilename(status))
    if (await Bun.file(candidate).exists()) return candidate
    if (current === pagesDir) break
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  return null
}

export async function renderErrorPage(filePath, status, message = '', dev = true) {
  const template = await Bun.file(filePath).text()
  const safeMessage = dev ? message : 'An unexpected error occurred'
  const html = render(template, {
    status: String(status),
    title: STATUS_TITLES[status] ?? 'Error',
    message: safeMessage,
  })
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
}
