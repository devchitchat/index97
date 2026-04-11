import path from 'node:path'

const DEFAULT_CSP = "default-src 'self'; style-src 'self'; script-src 'self'"

function buildSecurityHeaders({
  csp,
  permissionsPolicy = 'camera=(), microphone=(), geolocation=()',
} = {}) {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // Static serve is always production — no HMR, no unsafe-inline needed
    'Content-Security-Policy': csp ?? DEFAULT_CSP,
    'Permissions-Policy': permissionsPolicy,
  }
}

function withSecurityHeaders(base, extra = {}) {
  const headers = new Headers(base)
  headers.delete('Server')
  for (const [k, v] of Object.entries(extra)) headers.set(k, v)
  return headers
}

export async function serveStatic({
  dir,
  port = 3000,
  csp,
  permissionsPolicy = 'camera=(), microphone=(), geolocation=()',
} = {}) {
  const resolvedBase = path.resolve(dir)
  const securityHeaders = buildSecurityHeaders({ csp, permissionsPolicy })

  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url)
      const pathname = url.pathname

      const resolvedPath = path.resolve(path.join(dir, pathname))
      if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
        return new Response('Not Found', { status: 404, headers: withSecurityHeaders(securityHeaders) })
      }

      // Try exact file first (assets like .css, .js, .png)
      // QUESTION: Should the content-type be determined and set here?
      const exactFile = Bun.file(resolvedPath)
      if (await exactFile.exists()) {
        return new Response(exactFile, { headers: withSecurityHeaders(securityHeaders) })
      }

      // Try pathname/index.html
      const indexFile = Bun.file(path.join(resolvedPath, 'index.html'))
      if (await indexFile.exists()) {
        return new Response(indexFile, { headers: withSecurityHeaders(securityHeaders, { 'Content-Type': 'text/html; charset=utf-8' }) })
      }

      return new Response('Not Found', { status: 404, headers: withSecurityHeaders(securityHeaders) })
    }
  })

  console.log(`\nindex97 serving ${dir} at http://localhost:${server.port}`)
  return server
}
