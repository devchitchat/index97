import { discoverRoutes } from './router.js'
import { dispatch } from './handler.js'
import { render } from './template.js'
import { injectHmrScript, createSseResponse, createWatcher, hmrClientFile } from './hot-reload.js'
import { findLayout, findLayoutData, applyLayout } from './layout.js'
import { rewriteFormMethods, resolveMethod } from './forms.js'
import { renderMarkdown } from './markdown.js'
import { resolveIncludes } from './partials.js'
import { findErrorPage, renderErrorPage, renderDefaultErrorPage } from './errors.js'
import path from 'node:path'

// Render layout data into the layout template BEFORE injecting page content.
// This prevents second-order template injection: user-controlled content (markdown,
// DB values) inserted via {{{raw}}} is never passed through render() with layout data,
// so {{session.email}} inside a blog post won't resolve against real session state.
// Mask used to protect {{content}} from being consumed by render() during the
// layout-data pass. {{slot:...}} is safe — render()'s regex only matches [\w.]+
// so the colon stops it matching slot tokens.
const CONTENT_MASK = '\x00content\x00'

async function applyLayoutWithData(pageHtml, layoutPath, req) {
  const layoutHtml = await Bun.file(layoutPath).text()
  const dataPath = await findLayoutData(layoutPath)
  let resolvedLayout = layoutHtml
  if (dataPath) {
    const mod = await import(dataPath)
    if (mod.data) {
      const layoutData = await mod.data(req)
      // Mask {{content}} so render() doesn't resolve it to '' before applyLayout
      // can inject the page. Restore it after so applyLayout finds the placeholder.
      const masked = layoutHtml.replace('{{content}}', CONTENT_MASK)
      resolvedLayout = render(masked, layoutData).replace(CONTENT_MASK, '{{content}}')
    }
  }
  return applyLayout(pageHtml, resolvedLayout)
}

function finalizeHtml(html, dev) {
  html = rewriteFormMethods(html)
  if (dev) html = injectHmrScript(html)
  return html
}

const DEFAULT_CSP = "default-src 'self'; style-src 'self'; script-src 'self'"

function buildSecurityHeaders(dev = false, {
  csp,
  permissionsPolicy = 'camera=(), microphone=(), geolocation=()',
} = {}) {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // HMR client is served as an external file (/__index97_hmr_client.js), so
    // script-src 'self' covers it — no unsafe-inline needed even in dev.
    'Content-Security-Policy': csp ?? DEFAULT_CSP,
    'Permissions-Policy': permissionsPolicy,
  }
}

function addSecurityHeaders(response, securityHeaders) {
  const headers = new Headers(response.headers)
  // Suppress Bun's default fingerprinting header
  headers.delete('Server')
  for (const [k, v] of Object.entries(securityHeaders)) {
    // Allow per-response Permissions-Policy override from handler routes
    if (k === 'Permissions-Policy' && headers.has(k)) continue
    headers.set(k, v)
  }
  return new Response(response.body, { status: response.status, headers })
}

async function resolveErrorResponse(status, message, notFoundPage, pagesDir, dev) {
  if (notFoundPage && status === 404) {
    if (await Bun.file(notFoundPage).exists()) {
      return renderErrorPage(notFoundPage, status, message, dev)
    }
  }
  const errorPage = await findErrorPage(status, pagesDir, pagesDir)
  if (errorPage) return renderErrorPage(errorPage, status, message, dev)
  return renderDefaultErrorPage(status)
}

function withErrorHandler(handler, pagesDir, dev, securityHeaders, notFoundPage) {
  return async (req) => {
    try {
      const response = await handler(req)
      if (response.status >= 400) {
        const errorPage = await findErrorPage(response.status, pagesDir, pagesDir)
        if (errorPage) return addSecurityHeaders(await renderErrorPage(errorPage, response.status, '', dev), securityHeaders)
      }
      return addSecurityHeaders(response, securityHeaders)
    } catch (err) {
      console.error(err)
      const status = err.status ?? 500
      return addSecurityHeaders(await resolveErrorResponse(status, err?.message ?? '', notFoundPage, pagesDir, dev), securityHeaders)
    }
  }
}

export async function createServer({
  pagesDir = process.cwd(),
  port = 3000,
  dev = true,
  csp,
  permissionsPolicy = 'camera=(), microphone=(), geolocation=()',
  onShutdown = null,
  notFoundPage = null,
  ...serveOptions
} = {}) {
  const securityHeaders = buildSecurityHeaders(dev, { csp, permissionsPolicy })
  const routes = await discoverRoutes(pagesDir)
  const bunRoutes = {}

  for (const route of routes) {
    if (route.kind === 'document') {
      bunRoutes[route.pattern] = withErrorHandler(async () => {
        const html = await Bun.file(route.filePath).text()
        return new Response(finalizeHtml(html, dev), { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
      }, pagesDir, dev, securityHeaders, notFoundPage)
    } else if (route.kind === 'page') {
      bunRoutes[route.pattern] = withErrorHandler(async (req) => {
        let html = await Bun.file(route.filePath).text()
        const jsPath = route.filePath.replace(/\.phtml$/, '.js')
        let data = {}
        if (await Bun.file(jsPath).exists()) {
          const mod = await import(jsPath)
          if (mod.data) data = await mod.data(Object.fromEntries(new URL(req.url).searchParams))
        }
        html = render(html, data)
        html = await resolveIncludes(html, data, pagesDir)
        const layoutPath = await findLayout(route.filePath, pagesDir)
        if (layoutPath) html = await applyLayoutWithData(html, layoutPath, req)
        return new Response(finalizeHtml(html, dev), { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
      }, pagesDir, dev, securityHeaders)
    } else if (route.kind === 'markdown') {
      bunRoutes[route.pattern] = withErrorHandler(async (req) => {
        const src = await Bun.file(route.filePath).text()
        const { html: body, data } = renderMarkdown(src)
        const layoutPath = await findLayout(route.filePath, pagesDir)
        let html = body
        if (layoutPath) {
          const slots = Object.entries(data)
            .map(([k, v]) => `<template data-slot="${k}">${v}</template>`)
            .join('')
          html = await applyLayoutWithData(slots + body, layoutPath, req)
        }
        return new Response(finalizeHtml(html, dev), { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
      }, pagesDir, dev, securityHeaders)
    } else if (route.kind === 'handler') {
      bunRoutes[route.pattern] = withErrorHandler(async (req) => {
        const { method, req: resolvedReq } = await resolveMethod(req)
        const mod = await import(route.filePath)
        if (!mod[method]) return new Response('Method Not Allowed', { status: 405 })
        const { response, data } = await dispatch(mod[method], resolvedReq, route)
        if (response.headers.get('Content-Type')?.includes('text/html')) {
          let html = await response.text()
          html = await resolveIncludes(html, data, pagesDir)
          if (route.template) {
            const layoutPath = await findLayout(route.template, pagesDir)
            if (layoutPath) html = await applyLayoutWithData(html, layoutPath, req)
          }
          return new Response(finalizeHtml(html, dev), { status: response.status, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
        }
        return response
      }, pagesDir, dev, securityHeaders)
    }
  }

  const { routes: extraRoutes = {}, ...restServeOptions } = serveOptions

  const publicDir = path.join(pagesDir, 'public')
  const resolvedPublicBase = path.resolve(publicDir)

  const server = Bun.serve({
    port,
    ...restServeOptions,
    routes: { ...extraRoutes, ...bunRoutes },
    async fetch(req) {
      const url = new URL(req.url)

      if (dev && url.pathname === '/__index97_hmr') {
        return createSseResponse()
      }

      if (dev && url.pathname === '/__index97_hmr_client.js') {
        return new Response(hmrClientFile, { headers: { 'Content-Type': 'application/javascript' } })
      }

      // Bounds-check public file path to prevent directory traversal
      const resolvedPublicPath = path.resolve(path.join(publicDir, url.pathname))
      if (resolvedPublicPath.startsWith(resolvedPublicBase + path.sep)) {
        const publicFile = Bun.file(resolvedPublicPath)
        if (await publicFile.exists()) return addSecurityHeaders(new Response(publicFile), securityHeaders)
      }

      return addSecurityHeaders(await resolveErrorResponse(404, 'Page not found', notFoundPage, pagesDir, dev), securityHeaders)
    }
  })

  if (dev) createWatcher(pagesDir)

  if (onShutdown) {
    const shutdown = () => onShutdown(server)
    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  }

  console.log(`\nindex97 running at ${server.url.href}`)
  return server
}
