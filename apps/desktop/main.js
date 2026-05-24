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
  const proc = spawn(cmd, args, {
    cwd,
    shell: process.platform === 'win32',
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

// ─── Server startup ────────────────────────────────────────────────────────────

async function startServers() {
  const apiRunning = await isPortListening(API_PORT)
  const webRunning = await isPortListening(WEB_PORT)

  if (IS_DEV) {
    const root = path.resolve(__dirname, '..', '..')

    if (!apiRunning) {
      spawnServer('npm', ['run', 'dev'], path.join(root, 'apps', 'api'))
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
    const res = process.resourcesPath
    const apiDir = path.join(res, 'api')
    const webDir = path.join(res, 'web')

    // Merge env: user-configured overrides bundled default
    const userEnvPath = path.join(app.getPath('userData'), 'app.env')
    const bundledEnvPath = path.join(apiDir, '.env')
    const envPath = fs.existsSync(userEnvPath) ? userEnvPath : bundledEnvPath

    const apiEnv = {}
    if (fs.existsSync(envPath)) {
      fs.readFileSync(envPath, 'utf-8')
        .split(/\r?\n/)
        .forEach((line) => {
          const eq = line.indexOf('=')
          if (eq > 0) {
            const k = line.slice(0, eq).trim()
            const v = line.slice(eq + 1).trim()
            if (k && !k.startsWith('#')) apiEnv[k] = v
          }
        })
    }

    if (!apiRunning) {
      spawnServer('node', ['dist/index.js'], apiDir, {
        ...apiEnv,
        PORT: String(API_PORT),
        NODE_ENV: 'production',
      })
    }

    if (!webRunning) {
      spawnServer('node', ['server.js'], webDir, {
        PORT: String(WEB_PORT),
        HOSTNAME: '127.0.0.1',
        NODE_ENV: 'production',
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
      `تعذّر تشغيل الخوادم الداخلية.\n\nتأكد من أن قاعدة البيانات (Docker) تعمل وأن المنافذ ${API_PORT} و${WEB_PORT} متاحة.\n\nالتفاصيل: ${err.message}`,
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
