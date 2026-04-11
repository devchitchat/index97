import { watch } from 'node:fs'

const encoder = new TextEncoder()
const clients = new Set()
export const HMR_SCRIPT = '<script src="/__index97_hmr_client.js"></script>'

export const hmrClientFile = Bun.file(new URL('./hmr-client.js', import.meta.url))

export function injectHmrScript(html) {
  if (html.includes('</body>')) {
    return html.replace('</body>', HMR_SCRIPT + '</body>')
  }
  return html + HMR_SCRIPT
}

export function createSseResponse() {
  let controller
  const stream = new ReadableStream({
    start(c) {
      controller = c
      clients.add(controller)
    },
    cancel() {
      clients.delete(controller)
    }
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}

export function notifyClients(filename = '') {
  const type = filename.endsWith('.css') ? 'css' : 'reload'
  const data = encoder.encode(`data: ${JSON.stringify({ type, file: filename })}\n\n`)
  for (const controller of clients) {
    try {
      controller.enqueue(data)
    } catch {
      clients.delete(controller)
    }
  }
}

export function createWatcher(dir) {
  return watch(dir, { recursive: true }, (_event, filename) => {
    if (!filename || filename.includes('node_modules')) return
    notifyClients(filename)
  })
}
