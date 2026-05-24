'use strict'

const { contextBridge } = require('electron')

// Expose a minimal, safe surface to the renderer
contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  isElectron: true,
})
