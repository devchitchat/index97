import path from 'node:path'
import { render } from './template.js'

const DEFAULT_ERROR_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{status}} — {{title}}</title>
</head>
<body>
  <h1>{{status}} — {{title}}</h1>
</body>
</html>`

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

export function renderDefaultErrorPage(status) {
  const html = render(DEFAULT_ERROR_HTML, {
    status: String(status),
    title: STATUS_TITLES[status] ?? 'Error',
  })
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
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
