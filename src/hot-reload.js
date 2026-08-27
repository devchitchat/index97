import { watch } from 'node:fs'

const encoder = new TextEncoder()
const clients = new Set()

// Kept for backward-compat with any downstream that imported it. Callers
// should prefer `hmrScript(prefix)` so the injected src respects BASE_PATH.
export const HMR_SCRIPT = '<script src="/__index97_hmr_client.js"></script>'

export const hmrClientFile = Bun.file(new URL('./hmr-client.js', import.meta.url))

/** Build the HMR script tag for a given URL prefix (e.g. '/todo-app' or ''). */
export function hmrScript(prefix = '') {
  return `<script src="${prefix}/__index97_hmr_client.js"></script>`
}

/**
 * Inject the HMR bootstrap script before </body>. Prefix is prepended to
 * the client script src so hmr-client.js can derive the base from its own
 * URL and open EventSource at the prefixed /__index97_hmr endpoint.
 */
export function injectHmrScript(html, prefix = '') {
  const tag = hmrScript(prefix)
  if (html.includes('</body>')) {
    return html.replace('</body>', tag + '</body>')
  }
  return html + tag
}

const HEARTBEAT = encoder.encode(': ping\n\n')
const HEARTBEAT_INTERVAL_MS = 8000

export function createSseResponse() {
  let controller
  let heartbeat
  const stream = new ReadableStream({
    start(c) {
      controller = c
      clients.add(controller)
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(HEARTBEAT)
        } catch {
          clearInterval(heartbeat)
          clients.delete(controller)
        }
      }, HEARTBEAT_INTERVAL_MS)
    },
    cancel() {
      clearInterval(heartbeat)
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
