export { createServer } from './src/server.js'
export { render, escapeHtml } from './src/template.js'
export { discoverRoutes } from './src/router.js'

const config = {
  port: process.env.PORT ?? 3000,
  env: process.env.NODE_ENV ?? 'dev'
}

if (import.meta.main) {
  const { createServer } = await import('./src/server.js')
  await createServer({ pagesDir: process.cwd(), port: config.port, dev: config.env === 'dev',
    onShutdown: (server) => {
      server.stop()
      process.exit(0)
    }
   })
}
