import { discoverRoutes } from './router.js'
import path from 'node:path'
import { mkdir, stat } from 'node:fs/promises'

export function rewriteBase(html, base) {
  if (!base) return html
  return html
    .replaceAll('href="/', `href="${base}`)
    .replaceAll('src="/', `src="${base}`)
    .replaceAll('action="/', `action="${base}`)
}

export function patternToUrl(pattern, params) {
  return pattern.replace(/:(\w+)/g, (_, key) => params[key])
}

export function urlToOutputPath(url, outDir) {
  if (url === '/') return path.join(outDir, 'index.html')
  return path.join(outDir, url.replace(/^\//, ''), 'index.html')
}

export async function enumerateUrls(routes, pagesDir) {
  const entries = []

  for (const route of routes) {
    const isDynamic = route.pattern.includes(':')

    if (isDynamic) {
      if (route.kind !== 'handler') continue
      const mod = await import(route.filePath)
      if (!mod.staticPaths) {
        console.warn(`[build] skipping ${route.pattern} — no staticPaths() export`)
        continue
      }
      const paramsList = await mod.staticPaths()
      for (const params of paramsList) {
        entries.push({ url: patternToUrl(route.pattern, params), params })
      }
    } else {
      entries.push({ url: route.pattern, params: {} })
    }
  }

  return entries
}

export async function copyPublicDir(pagesDir, outDir) {
  const publicDir = path.join(pagesDir, 'public')
  const publicDirExists = await stat(publicDir).then(s => s.isDirectory()).catch(() => false)
  if (!publicDirExists) return
  const glob = new Bun.Glob('**/*')
  for await (const file of glob.scan({ cwd: publicDir, onlyFiles: true })) {
    const dest = path.join(outDir, file)
    await mkdir(path.dirname(dest), { recursive: true })
    await Bun.write(dest, Bun.file(path.join(publicDir, file)))
  }
}

export async function build({ pagesDir, outDir = 'dist', pathPrefix }) {
  const { createServer } = await import('./server.js')

  const routes = await discoverRoutes(pagesDir)
  const server = await createServer({ pagesDir, port: 0, dev: false })
  const origin = `http://localhost:${server.port}`

  const entries = await enumerateUrls(routes, pagesDir)

  for (const { url } of entries) {
    const res = await fetch(origin + url)
    if (!res.ok) {
      console.warn(`[build] ${url} → ${res.status}, skipping`)
      continue
    }
    const contentType = res.headers.get('Content-Type') ?? ''
    if (!contentType.includes('text/html')) continue
    const html = rewriteBase(await res.text(), pathPrefix)
    const outPath = urlToOutputPath(url, outDir)
    await mkdir(path.dirname(outPath), { recursive: true })
    await Bun.write(outPath, html)
    console.log(`[build] ${url} → ${outPath}`)
  }

  await copyPublicDir(pagesDir, outDir)

  server.stop()
  console.log(`[build] done → ${outDir}/`)
}
