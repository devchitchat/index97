import path from 'node:path'

const COMMANDS = new Set(['dev', 'start', 'build', 'serve'])

export function parseArgs(argv) {
  const command = argv[0]

  if (!command || !COMMANDS.has(command)) {
    throw new Error(
      `Unknown command: "${command ?? ''}".
Usage: index97 <dev|start|build|serve> [dir] [--port <port>] [--out <dir>] [--path-prefix <path>]
  Build Static Site:
  index97 build <source directory> --out <destination> [--path-prefix /subpath/]

  Serve Static Site:
  index97 serve <destination directory from building> --port <port number|3000>

  Serve Dynamic Site:
  index97 start <dir> --port <port number|3000>
`
    )
  }

  let port = parseInt(process.env.PORT ?? '3000')
  let pagesDir = process.cwd()
  let outDir = 'dist'
  let pathPrefix

  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--port') {
      port = parseInt(argv[++i])
    } else if (argv[i] === '--out') {
      outDir = argv[++i]
    } else if (argv[i] === '--path-prefix') {
      pathPrefix = argv[++i]
    } else if (!argv[i].startsWith('--')) {
      if (command === 'serve') {
        outDir = argv[i]
      } else {
        pagesDir = path.resolve(argv[i])
      }
    }
  }
  console.log(command, pagesDir, port, outDir)
  return { command, pagesDir, port, outDir, pathPrefix, dev: command === 'dev' }
}
