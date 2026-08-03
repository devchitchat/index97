import path from 'node:path'
import { build } from './src/build.js'

const pagesDir = path.join(import.meta.dir, 'example')
const pathPrefix = process.env.PATH_PREFIX ?? ''

await build({ pagesDir, outDir: 'dist', pathPrefix })
