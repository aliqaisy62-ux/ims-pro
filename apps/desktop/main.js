const { app, BrowserWindow, Menu, shell } = require('electron')
const path = require('path')

const APP_URL = 'https://ims-pro.vercel.app'

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Etana — نظام إدارة المخزون',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    autoHideMenuBar: true,
    show: false,
  })

  // Show only after content loads to avoid white flash
  win.once('ready-to-show', () => win.show())

  win.loadURL(APP_URL)

  // Open external links in the system browser, not inside the app
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
