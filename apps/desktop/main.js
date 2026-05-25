'use strict'

const { app, BrowserWindow, Menu, shell, dialog, globalShortcut } = require('electron')
const { spawn, execSync } = require('child_process')
const path = require('path')
const http = require('http')
const fs = require('fs')
const os = require('os')

const IS_DEV   = !app.isPackaged
const API_PORT = 4001
const WEB_PORT = 3001

// ─── ASCII-safe userData path ──────────────────────────────────────────────────
// app.getPath('userData') would include the productName which contains Arabic.
// Prisma's SQLite driver cannot handle non-ASCII characters in file paths on
// Windows, so we force a plain ASCII path before anything else runs.
if (!IS_DEV) {
  app.setPath('userData', path.join(app.getPath('appData'), 'IMS-Pro'))
}

let mainWindow  = null
let splashWindow = null
const children  = []

// ─── Logging ──────────────────────────────────────────────────────────────────

const LOG_DIR  = path.join(os.homedir(), 'IMS-Pro-Logs')
const LOG_FILE = path.join(LOG_DIR, 'app.log')
const LOG_OLD  = path.join(LOG_DIR, 'app.log.old')

function initLogger() {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true })
    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > 5 * 1024 * 1024) {
      fs.renameSync(LOG_FILE, LOG_OLD)
    }
  } catch {}
}

function log(msg) {
  const ts   = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const line = `[${ts}] ${msg}\n`
  process.stdout.write(line)
  try { fs.appendFileSync(LOG_FILE, line) } catch {}
}

// Logs all key paths and their existence — call after resourcesPath is known.
function logStartInfo(res) {
  log('[info] ── startup diagnostic ─────────────────────────────')
  log(`[info] app.isPackaged       : ${app.isPackaged}`)
  log(`[info] app version          : ${app.getVersion()}`)
  log(`[info] resourcesPath        : ${res}`)
  log(`[info] userData             : ${app.getPath('userData')}`)
  log(`[info] log file             : ${LOG_FILE}`)

  const check = (label, p) =>
    log(`[info] ${label.padEnd(22)}: ${fs.existsSync(p) ? 'EXISTS' : 'MISSING'} — ${p}`)

  check('node.exe',            path.join(res, 'node', 'node.exe'))
  check('api/server.js',       path.join(res, 'api', 'server.js'))
  check('web/server.js',       path.join(res, 'web', 'server.js'))
  check('seed.db',             path.join(res, 'seed.db'))
  check('.prisma/client',      path.join(res, 'api', 'node_modules', '.prisma', 'client'))
  check('query_engine.node',   path.join(res, 'api', 'node_modules', '.prisma', 'client',
                                          'query_engine-windows.dll.node'))
  log('[info] ─────────────────────────────────────────────────────')
}

// Validates the SQLite file by reading its 16-byte magic header.
function validateSqliteFile(filePath) {
  try {
    const buf = Buffer.alloc(16)
    const fd  = fs.openSync(filePath, 'r')
    fs.readSync(fd, buf, 0, 16, 0)
    fs.closeSync(fd)
    const magic = buf.toString('utf8', 0, 15)
    if (magic === 'SQLite format 3') {
      const sizeKB = Math.round(fs.statSync(filePath).size / 1024)
      log(`[db] SQLite magic OK — ${sizeKB} KB — ${filePath}`)
      return true
    }
    log(`[db] WARN: file exists but SQLite magic header missing — ${filePath}`)
    return false
  } catch (e) {
    log(`[db] ERROR reading file: ${e.message}`)
    return false
  }
}

initLogger()
log(`[app] ── IMS-Pro starting ──────────────────────────────────`)

// ─── Port helpers ──────────────────────────────────────────────────────────────

function isPortListening(port) {
  return new Promise((resolve) => {
    const req = http.get({ hostname: '127.0.0.1', port, path: '/' }, (res) => {
      res.resume(); resolve(true)
    })
    req.on('error', () => resolve(false))
    req.end()
  })
}

function waitForPort(port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs
    const attempt  = () => {
      const req = http.get({ hostname: '127.0.0.1', port, path: '/' }, (res) => {
        res.resume(); resolve()
      })
      req.on('error', () => {
        if (Date.now() >= deadline) {
          reject(new Error(`Port :${port} did not respond within ${timeoutMs / 1000}s — check ${LOG_FILE}`))
        } else {
          setTimeout(attempt, 600)
        }
      })
      req.end()
    }
    attempt()
  })
}

// Polls /api/health until it returns 200 or times out.
function waitForApiHealth(timeoutMs) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs
    const attempt  = () => {
      const req = http.get(
        { hostname: '127.0.0.1', port: API_PORT, path: '/api/health' },
        (res) => {
          let body = ''
          res.on('data', (d) => { body += d })
          res.on('end', () => {
            log(`[api] health check: HTTP ${res.statusCode} — ${body.slice(0, 120)}`)
            if (res.statusCode === 200) resolve()
            else reject(new Error(`API health returned ${res.statusCode}: ${body.slice(0, 200)}`))
          })
        }
      )
      req.on('error', (e) => {
        if (Date.now() >= deadline) {
          reject(new Error(`API health timeout after ${timeoutMs / 1000}s — ${e.message}`))
        } else {
          setTimeout(attempt, 800)
        }
      })
      req.end()
    }
    attempt()
  })
}

// Kill any process LISTENING on the given port (production stale-process cleanup).
function killStalePort(port) {
  try {
    const out = execSync('netstat -ano', { encoding: 'utf8', timeout: 5000 })
    const re  = new RegExp(`\\s+[\\d.]+:${port}\\s+[\\d.:*]+\\s+LISTENING\\s+(\\d+)`, 'i')
    const seen = new Set()
    for (const line of out.split(/\r?\n/)) {
      const m = line.match(re)
      if (!m) continue
      const pid = m[1]
      if (seen.has(pid) || pid === String(process.pid)) continue
      seen.add(pid)
      try {
        execSync(`taskkill /PID ${pid} /F`, { timeout: 5000 })
        log(`[port] Killed stale PID ${pid} on :${port}`)
      } catch (e) {
        log(`[port] Could not kill PID ${pid}: ${e.message}`)
      }
    }
  } catch { /* port not in use or netstat unavailable */ }
}

// ─── Process management ────────────────────────────────────────────────────────

function spawnServer(cmd, args, cwd, env = {}) {
  const label    = path.basename(cwd)
  const useShell = !path.isAbsolute(cmd) && process.platform === 'win32'
  const proc     = spawn(cmd, args, {
    cwd,
    shell: useShell,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  proc.stdout?.on('data', (d) => log(`[${label}] ${d.toString().trimEnd()}`))
  proc.stderr?.on('data', (d) => log(`[${label}:ERR] ${d.toString().trimEnd()}`))
  proc.on('error',  (err)          => log(`[${label}] spawn error: ${err.message}`))
  proc.on('exit',   (code, signal) => log(`[${label}] exited code=${code} signal=${signal}`))
  children.push(proc)
  return proc
}

function killAll() {
  for (const proc of children) {
    try { proc.kill('SIGTERM') } catch {}
  }
}

// ─── Database initialisation (production) ─────────────────────────────────────

function initDatabase(res) {
  const userDataPath = app.getPath('userData')
  const dbFile       = path.join(userDataPath, 'cashier.db')

  log(`[db] userData path : ${userDataPath}`)
  log(`[db] database path : ${dbFile}`)

  if (!fs.existsSync(dbFile)) {
    const seedDb = path.join(res, 'seed.db')
    log(`[db] First run — seed.db: ${seedDb}  exists=${fs.existsSync(seedDb)}`)

    if (!fs.existsSync(seedDb)) {
      throw new Error(
        `seed.db not found in resources.\nExpected: ${seedDb}\n` +
        `Check that the build included assets/seed.db in extraResources.`
      )
    }

    fs.mkdirSync(userDataPath, { recursive: true })
    fs.copyFileSync(seedDb, dbFile)
    log(`[db] Copied seed.db → ${dbFile}`)
  }

  // Validate the DB is a real SQLite file (not zero-byte or corrupted)
  if (!validateSqliteFile(dbFile)) {
    // Try to recover by re-copying seed.db
    log(`[db] Database appears corrupt — attempting recovery from seed.db`)
    const seedDb = path.join(res, 'seed.db')
    if (fs.existsSync(seedDb)) {
      fs.copyFileSync(seedDb, dbFile)
      log(`[db] Recovery copy done`)
      if (!validateSqliteFile(dbFile)) {
        throw new Error(`Database recovery failed. seed.db itself may be corrupt: ${seedDb}`)
      }
    } else {
      throw new Error(`Database is invalid and seed.db not found for recovery: ${dbFile}`)
    }
  }

  try {
    fs.accessSync(dbFile, fs.constants.R_OK | fs.constants.W_OK)
  } catch (e) {
    throw new Error(`Database not readable/writable: ${dbFile}\n${e.message}`)
  }

  return 'file:' + dbFile.replace(/\\/g, '/')
}

// ─── Server startup ────────────────────────────────────────────────────────────

async function startServers() {
  if (IS_DEV) {
    const root      = path.resolve(__dirname, '..', '..')
    const devDbFile = path.resolve(root, 'data', 'cashier.db')
    const devDbUrl  = 'file:' + devDbFile.replace(/\\/g, '/')

    const apiRunning = await isPortListening(API_PORT)
    const webRunning = await isPortListening(WEB_PORT)

    if (!apiRunning) {
      spawnServer('npm', ['run', 'dev'], path.join(root, 'apps', 'api'), {
        DATABASE_URL: devDbUrl,
      })
    } else {
      log(`[app] API already on :${API_PORT}`)
    }
    if (!webRunning) {
      spawnServer('npm', ['run', 'dev'], path.join(root, 'apps', 'web'), {
        NEXT_PUBLIC_API_URL: `http://localhost:${API_PORT}`,
      })
    } else {
      log(`[app] Web already on :${WEB_PORT}`)
    }
    return
  }

  // ── Production ──────────────────────────────────────────────────────────────
  const res     = process.resourcesPath
  const apiDir  = path.join(res, 'api')
  const webDir  = path.join(res, 'web')
  const nodeExe = path.join(res, 'node', 'node.exe')
  const prismaEngineLib = path.join(
    apiDir, 'node_modules', '.prisma', 'client', 'query_engine-windows.dll.node'
  )

  logStartInfo(res)

  // Hard checks before any spawn attempt
  if (!fs.existsSync(nodeExe))                    throw new Error(`Bundled node.exe not found:\n${nodeExe}`)
  if (!fs.existsSync(path.join(apiDir,'server.js'))) throw new Error(`api/server.js not found:\n${apiDir}`)
  if (!fs.existsSync(path.join(webDir,'server.js'))) throw new Error(`web/server.js not found:\n${webDir}`)
  if (!fs.existsSync(prismaEngineLib))            log(`[warn] Prisma engine .node file missing — API may crash:\n${prismaEngineLib}`)

  // Kill stale processes then re-check ports
  log(`[app] Clearing stale processes on :${API_PORT} and :${WEB_PORT}`)
  killStalePort(API_PORT)
  killStalePort(WEB_PORT)
  await new Promise((r) => setTimeout(r, 400))

  const apiRunning = await isPortListening(API_PORT)
  const webRunning = await isPortListening(WEB_PORT)
  log(`[app] Port check after cleanup — api=${apiRunning}  web=${webRunning}`)

  const dbUrl = initDatabase(res)
  log(`[app] DATABASE_URL: ${dbUrl}`)

  if (!apiRunning) {
    log(`[app] Spawning API: ${nodeExe} server.js in ${apiDir}`)
    spawnServer(nodeExe, ['server.js'], apiDir, {
      DATABASE_URL:                dbUrl,
      // Point Prisma directly at the bundled native query engine
      PRISMA_QUERY_ENGINE_LIBRARY: prismaEngineLib,
      JWT_SECRET:                  'ims-pro-jwt-secret-change-before-production-min-32-chars',
      JWT_REFRESH_SECRET:          'ims-pro-refresh-secret-change-before-production-min-32-chars',
      PORT:                        String(API_PORT),
      NODE_ENV:                    'production',
      CORS_ORIGIN:                 `http://localhost:${WEB_PORT}`,
    })
  } else {
    log(`[app] API already on :${API_PORT}`)
  }

  if (!webRunning) {
    log(`[app] Spawning Web: ${nodeExe} server.js in ${webDir}`)
    spawnServer(nodeExe, ['server.js'], webDir, {
      PORT:                String(WEB_PORT),
      HOSTNAME:            '127.0.0.1',
      NODE_ENV:            'production',
      NEXT_PUBLIC_API_URL: `http://localhost:${API_PORT}`,
    })
  } else {
    log(`[app] Web already on :${WEB_PORT}`)
  }
}

// ─── Windows ────────────────────────────────────────────────────────────────────

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 440, height: 300,
    frame: false, resizable: false, center: true,
    alwaysOnTop: true, backgroundColor: '#1e40af',
    webPreferences: { contextIsolation: true },
  })
  splashWindow.loadFile(path.join(__dirname, 'splash.html'))
}

function destroySplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.destroy()
    splashWindow = null
  }
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 820, minWidth: 960, minHeight: 600,
    title: 'IMS-Pro', show: false, backgroundColor: '#f9fafb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, webSecurity: true,
    },
  })

  Menu.setApplicationMenu(null)

  // Ctrl+Shift+I toggles DevTools in dev and production
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.toggleDevTools()
  })

  await mainWindow.loadURL(`http://127.0.0.1:${WEB_PORT}`)

  mainWindow.once('ready-to-show', () => {
    destroySplash()
    mainWindow.show()
    mainWindow.focus()
    if (IS_DEV) mainWindow.webContents.openDevTools({ mode: 'detach' })
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const isLocal =
      url.startsWith(`http://127.0.0.1:${WEB_PORT}`) ||
      url.startsWith(`http://localhost:${WEB_PORT}`)
    if (isLocal) return { action: 'allow' }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    globalShortcut.unregisterAll()
    mainWindow = null
  })
}

// ─── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  createSplash()

  try {
    await startServers()

    // Wait for port TCP handshake first (fast)
    await Promise.all([
      waitForPort(API_PORT, 60_000),
      waitForPort(WEB_PORT, 120_000),
    ])

    // Then confirm the API is actually serving requests
    await waitForApiHealth(30_000)

    await createMainWindow()
  } catch (err) {
    log(`[app] FATAL: ${err.message}`)
    if (err.stack) log(err.stack)
    destroySplash()
    dialog.showErrorBox(
      'IMS-Pro — خطأ في التشغيل',
      `${err.message}\n\nملف السجل (للدعم الفني):\n${LOG_FILE}`,
    )
    app.quit()
  }
})

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) await createMainWindow()
})

app.on('window-all-closed', () => {
  killAll()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', killAll)
app.on('will-quit',   killAll)
