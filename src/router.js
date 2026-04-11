import path from 'node:path'

const SKIP_DIRS = new Set(['public', 'node_modules', '.git', 'dist', 'data'])

function filePathToPattern(relativePath) {
  const ext = path.extname(relativePath)
  let route = relativePath.slice(0, -ext.length).replace(/\\/g, '/')

  route = route.replace(/\[([^\]]+)\]/g, ':$1')

  if (route === 'index') return '/'
  if (route.endsWith('/index')) route = route.slice(0, -6)

  return '/' + route
}

function routeKind(filePath) {
  if (filePath.endsWith('.phtml')) return 'page'
  if (filePath.endsWith('.html')) return 'document'
  if (filePath.endsWith('.js')) return 'handler'
  if (filePath.endsWith('.md')) return 'markdown'
  return null
}

export async function discoverRoutes(pagesDir) {
  const glob = new Bun.Glob('**/*.{html,js,phtml,md}')
  const allRoutes = []

  for await (const file of glob.scan({ cwd: pagesDir, onlyFiles: true })) {
    const parts = file.split('/')
    if (parts.some(p => SKIP_DIRS.has(p))) continue

    // Skip underscore files (_layout.html, _partials, etc.) — not routes
    const filename = parts[parts.length - 1]
    if (filename.startsWith('_')) continue

    const filePath = path.join(pagesDir, file)
    const kind = routeKind(filePath)
    if (!kind) continue

    const pattern = filePathToPattern(file)    
    const route = { pattern, filePath, kind }

    if (kind === 'handler') {
      const phtmlSibling = filePath.replace(/\.js$/, '.phtml')
      const htmlSibling = filePath.replace(/\.js$/, '.html')
      if (await Bun.file(phtmlSibling).exists()) {
        route.template = phtmlSibling
      } else if (await Bun.file(htmlSibling).exists()) {
        route.template = htmlSibling
      }
    }
    allRoutes.push(route)
  }

  // Deduplicate: .js handler wins over .html page for same pattern
  const byPattern = new Map()
  for (const route of allRoutes) {
    const existing = byPattern.get(route.pattern)
    if (!existing || (route.kind === 'handler' && (existing.kind === 'page' || existing.kind === 'document'))) {
      byPattern.set(route.pattern, route)
    }
  }

  return [...byPattern.values()]
}
