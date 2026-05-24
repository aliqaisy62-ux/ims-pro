/**
 * Bundles the Express API into a single server.js for the Electron desktop installer.
 * Output: apps/desktop/staging/api/server.js
 * Externalises @prisma/client (native binary — copied separately by build.ps1).
 */

import { build } from 'esbuild'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir    = resolve(__dirname, '..', 'desktop', 'staging', 'api')

await build({
  entryPoints: [resolve(__dirname, 'src', 'index.ts')],
  bundle:      true,
  platform:    'node',
  target:      'node18',
  format:      'cjs',
  outfile:     resolve(outDir, 'server.js'),
  external:    ['@prisma/client'],   // native binary — loaded from staging/api/node_modules
  sourcemap:   false,
  minify:      false,
  logLevel:    'info',
  define: {
    // Let the app know it is running in a packaged Electron context
    'process.env.ELECTRON_PACKAGED': '"true"',
  },
})

console.log(`\n✅ API bundled → ${outDir}/server.js`)
