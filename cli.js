#!/usr/bin/env bun
import { parseArgs } from './src/cli.js'
import { createServer } from './index.js'
import { build } from './src/build.js'
import { serveStatic } from './src/serve.js'

try {
  const { command, pagesDir, port, dev, outDir, pathPrefix } = parseArgs(process.argv.slice(2))
  if (command === 'build') {
    await build({ pagesDir, outDir, pathPrefix })
  } else if (command === 'serve') {
    await serveStatic({ dir: outDir, port })
  } else { // start
    await createServer({ pagesDir, port, dev,
      onShutdown: (server) => {
        server.stop()
        process.exit(0)
      }
     })
  }
} catch (err) {
  console.error(err.message)
  process.exit(1)
}
