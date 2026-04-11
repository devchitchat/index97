import { createServer } from './index.js'

await createServer({
  pagesDir: new URL('./example', import.meta.url).pathname,
  port: 3000,
  dev: true,
  onShutdown: (server) => {
    server.stop()
    process.exit(0)
  }
})
