'use strict'

const { app, BrowserWindow, Menu, shell, dialog, globalShortcut } = require('electron')
const { spawn, execSync } = require('child_process')
const path = require('path')
const http = require('http')
const fs = require('fs')
const os = require('os')

const IS_DEV = !app.isPackaged
const API_PORT = 4001
const WEB_PORT = 3001

let mainWindow = null
let splashWindow = null
const children = []

// ─── Logging ──────────────────────────────────────────────────────────────────

const LOG_DIR  = path.join(os.homedir(), 'IMS-Pro-Logs')
const LOG_FILE = path.join(LOG_DIR, 'app.log')
const LOG_OLD  = path.join(LOG_DIR, 'app.log.old')

function initLogger() {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true })
    // Rotate if log exceeds 5 MB
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

initLogger()
log(`[app] ── IMS-Pro starting ──────────────────────────────`)
log(`[app] packaged=${app.isPackaged}  version=${app.getVersion()}`)
log(`[app] log file: ${LOG_FILE}`)

// ─── Port helpers ──────────────────────────────────────────────────────────────

function isPortListening(port) {
  return new Promise((resolve) => {
    const req = http.get({ hostname: '127.0.0.1', port, path: '/' }, (res) => {
      res.resume()
      resolve(true)
    })
    req.on('error', () => resolve(false))
    req.end()
  })
}

function waitForPort(port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs
    const attempt = () => {
      const req = http.get({ hostname: '127.0.0.1', port, path: '/' }, (res) => {
        res.resume()
        resolve()
      })
      req.on('error', () => {
        if (Date.now() >= deadline) {
          reject(new Error(`Timeout waiting for port ${port} — check ${LOG_FILE} for details`))
        } else {
          setTimeout(attempt, 600)
        }
      })
      req.end()
    }
    attempt()
  })
}

// Kill any process currently LISTENING on the given port (Windows only).
function killStalePort(port) {
  try {
    const out = execSync('netstat -ano', { encoding: 'utf8', timeout: 5000 })
    // Match lines where the local address ends with :PORT and state is LISTENING
    const re = new RegExp(`\\s+[\\d.]+:${port}\\s+[\\d.:*]+\\s+LISTENING\\s+(\\d+)`, 'i')
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
  } catch {
    // netstat not available or no matches — safe to ignore
  }
}

// ─── Process management ────────────────────────────────────────────────────────

function spawnServer(cmd, args, cwd, env = {}) {
  const label = path.basename(cwd)
  // shell:true only for plain command names (PATH lookup); skip for absolute .exe paths
  const useShell = !path.isAbsolute(cmd) && process.platform === 'win32'
  const proc = spawn(cmd, args, {
    cwd,
    shell: useShell,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  proc.stdout?.on('data', (d) => log(`[${label}] ${d.toString().trimEnd()}`))
  proc.stderr?.on('data', (d) => log(`[${label}:ERR] ${d.toString().trimEnd()}`))
  proc.on('error', (err) => log(`[${label}] spawn error: ${err.message}`))
  proc.on('exit', (code, signal) => log(`[${label}] exited code=${code} signal=${signal}`))
  children.push(proc)
  return proc
}

function killAll() {
  for (const proc of children) {
    try { proc.kill('SIGTERM') } catch {}
  }
}

// ─── Database initialisation (production) ─────────────────────────────────────

function initDatabase() {
  const userDataPath = app.getPath('userData')
  const dbFile       = path.join(userDataPath, 'cashier.db')

  if (!fs.existsSync(dbFile)) {
    const seedDb = path.join(process.resourcesPath, 'seed.db')
    log(`[db] First run — seed.db path: ${seedDb}  exists=${fs.existsSync(seedDb)}`)
    if (!fs.existsSync(seedDb)) {
      throw new Error(`seed.db not found in resources: ${seedDb}`)
    }
    fs.mkdirSync(userDataPath, { recursive: true })
    fs.copyFileSync(seedDb, dbFile)
    log(`[db] Copied seed.db → ${dbFile}`)
  } else {
    log(`[db] Database found: ${dbFile}  size=${fs.statSync(dbFile).size} bytes`)
  }

  // Confirm the DB is actually readable before handing it to the API
  if (!fs.existsSync(dbFile)) {
    throw new Error(`Database missing after initialisation: ${dbFile}`)
  }
  try {
    fs.accessSync(dbFile, fs.constants.R_OK | fs.constants.W_OK)
  } catch (e) {
    throw new Error(`Database not readable/writable: ${dbFile} — ${e.message}`)
  }

  return 'file:' + dbFile.replace(/\\/g, '/')
}

// ─── Server startup ────────────────────────────────────────────────────────────

async function startServers() {
  // Kill stale processes first so ports are definitely free
  log(`[app] Clearing stale processes on :${API_PORT} and :${WEB_PORT}`)
  killStalePort(API_PORT)
  killStalePort(WEB_PORT)
  await new Promise((r) => setTimeout(r, 400))

  const apiRunning = await isPortListening(API_PORT)
  const webRunning = await isPortListening(WEB_PORT)
  log(`[app] Port check — api=${apiRunning}  web=${webRunning}`)

  if (IS_DEV) {
    const root      = path.resolve(__dirname, '..', '..')
    const devDbFile = path.resolve(root, 'data', 'cashier.db')
    const devDbUrl  = 'file:' + devDbFile.replace(/\\/g, '/')

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
  } else {
    const res     = process.resourcesPath
    const apiDir  = path.join(res, 'api')
    const webDir  = path.join(res, 'web')
    const nodeExe = path.join(res, 'node', 'node.exe')

    log(`[app] resourcesPath : ${res}`)
    log(`[app] nodeExe       : ${nodeExe}  exists=${fs.existsSync(nodeExe)}`)
    log(`[app] apiDir        : ${apiDir}  exists=${fs.existsSync(apiDir)}`)
    log(`[app] webDir        : ${webDir}  exists=${fs.existsSync(webDir)}`)
    log(`[app] api/server.js : exists=${fs.existsSync(path.join(apiDir, 'server.js'))}`)
    log(`[app] web/server.js : exists=${fs.existsSync(path.join(webDir, 'server.js'))}`)

    if (!fs.existsSync(nodeExe)) {
      throw new Error(`Bundled node.exe not found: ${nodeExe}`)
    }
    if (!fs.existsSync(path.join(apiDir, 'server.js'))) {
      throw new Error(`API server.js not found: ${path.join(apiDir, 'server.js')}`)
    }
    if (!fs.existsSync(path.join(webDir, 'server.js'))) {
      throw new Error(`Web server.js not found: ${path.join(webDir, 'server.js')}`)
    }

    const dbUrl = initDatabase()
    log(`[app] DATABASE_URL: ${dbUrl}`)

    if (!apiRunning) {
      spawnServer(nodeExe, ['server.js'], apiDir, {
        DATABASE_URL:       dbUrl,
        JWT_SECRET:         '***REMOVED***',
        JWT_REFRESH_SECRET: '***REMOVED***',
        PORT:               String(API_PORT),
        NODE_ENV:           'production',
        CORS_ORIGIN:        `http://localhost:${WEB_PORT}`,
      })
    } else {
      log(`[app] API already on :${API_PORT}`)
    }

    if (!webRunning) {
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
}

// ─── Windows ────────────────────────────────────────────────────────────────────

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 440,
    height: 300,
    frame: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    backgroundColor: '#1e40af',
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
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 600,
    title: 'IMS-Pro — إيتانا',
    show: false,
    backgroundColor: '#f9fafb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  })

  Menu.setApplicationMenu(null)

  // Ctrl+Shift+I opens DevTools in both dev and production builds
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.toggleDevTools()
    }
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
    await Promise.all([
      waitForPort(API_PORT, 60_000),
      waitForPort(WEB_PORT, 120_000),
    ])
    await createMainWindow()
  } catch (err) {
    log(`[app] FATAL: ${err.message}`)
    if (err.stack) log(err.stack)
    destroySplash()
    dialog.showErrorBox(
      'خطأ في تشغيل IMS-Pro',
      `تعذّر تشغيل الخوادم الداخلية.\n\n${err.message}\n\nملف السجل:\n${LOG_FILE}`,
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
app.on('will-quit', killAll)
