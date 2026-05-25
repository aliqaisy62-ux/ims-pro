'use strict'

const { app, BrowserWindow, Menu, shell, dialog } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const http = require('http')
const fs = require('fs')

const IS_DEV = !app.isPackaged
const API_PORT = 4001
const WEB_PORT = 3001

let mainWindow = null
let splashWindow = null
const children = []

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
          reject(new Error(`Timeout waiting for port ${port}`))
        } else {
          setTimeout(attempt, 600)
        }
      })
      req.end()
    }
    attempt()
  })
}

// ─── Process management ────────────────────────────────────────────────────────

function spawnServer(cmd, args, cwd, env = {}) {
  const label = path.basename(cwd)
  // shell:true only needed when using plain 'npm' / 'node' (PATH lookup on Windows).
  // When cmd is an absolute .exe path (production bundled node.exe), skip the shell.
  const useShell = !path.isAbsolute(cmd) && process.platform === 'win32'
  const proc = spawn(cmd, args, {
    cwd,
    shell: useShell,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  proc.stdout?.on('data', (d) => process.stdout.write(`[${label}] ${d}`))
  proc.stderr?.on('data', (d) => process.stderr.write(`[${label}] ${d}`))
  proc.on('error', (err) => console.error(`[${label}] spawn error:`, err.message))
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
  const dbFile = path.join(userDataPath, 'cashier.db')

  if (!fs.existsSync(dbFile)) {
    const seedDb = path.join(process.resourcesPath, 'seed.db')
    if (!fs.existsSync(seedDb)) {
      throw new Error(`seed.db not found in resources: ${seedDb}`)
    }
    fs.mkdirSync(userDataPath, { recursive: true })
    fs.copyFileSync(seedDb, dbFile)
    console.log(`[desktop] First run — copied seed.db to ${dbFile}`)
  } else {
    console.log(`[desktop] Database ready: ${dbFile}`)
  }

  // Single "file:" prefix + forward slashes — correct Prisma SQLite URI on Windows
  return 'file:' + dbFile.replace(/\\/g, '/')
}

// ─── Server startup ────────────────────────────────────────────────────────────

async function startServers() {
  const apiRunning = await isPortListening(API_PORT)
  const webRunning = await isPortListening(WEB_PORT)

  if (IS_DEV) {
    const root = path.resolve(__dirname, '..', '..')

    // Resolve SQLite DB path for dev — absolute so Prisma ignores CWD
    const devDbFile = path.resolve(root, 'data', 'cashier.db')
    const devDbUrl  = 'file:' + devDbFile.replace(/\\/g, '/')

    if (!apiRunning) {
      spawnServer('npm', ['run', 'dev'], path.join(root, 'apps', 'api'), {
        DATABASE_URL: devDbUrl,
      })
    } else {
      console.log(`[desktop] API already on :${API_PORT}`)
    }

    if (!webRunning) {
      spawnServer('npm', ['run', 'dev'], path.join(root, 'apps', 'web'), {
        NEXT_PUBLIC_API_URL: `http://localhost:${API_PORT}`,
      })
    } else {
      console.log(`[desktop] Web already on :${WEB_PORT}`)
    }
  } else {
    // Production: servers live in electron extraResources
    const res     = process.resourcesPath
    const apiDir  = path.join(res, 'api')
    const webDir  = path.join(res, 'web')
    // Use the bundled node.exe — clients need no system Node.js installed
    const nodeExe = path.join(res, 'node', 'node.exe')

    // Initialise / locate the SQLite database
    const dbUrl = initDatabase()

    if (!apiRunning) {
      spawnServer(nodeExe, ['server.js'], apiDir, {
        DATABASE_URL:       dbUrl,
        JWT_SECRET:         'ims-pro-jwt-secret-change-before-production-min-32-chars',
        JWT_REFRESH_SECRET: 'ims-pro-refresh-secret-change-before-production-min-32-chars',
        PORT:               String(API_PORT),
        NODE_ENV:           'production',
        CORS_ORIGIN:        `http://localhost:${WEB_PORT}`,
      })
    }

    if (!webRunning) {
      spawnServer(nodeExe, ['server.js'], webDir, {
        PORT:                String(WEB_PORT),
        HOSTNAME:            '127.0.0.1',
        NODE_ENV:            'production',
        NEXT_PUBLIC_API_URL: `http://localhost:${API_PORT}`,
      })
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

  mainWindow.on('closed', () => { mainWindow = null })
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
    destroySplash()
    dialog.showErrorBox(
      'خطأ في تشغيل IMS-Pro',
      `تعذّر تشغيل الخوادم الداخلية.\n\nالتفاصيل: ${err.message}`,
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
