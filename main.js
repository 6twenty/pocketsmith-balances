const got = require('got')
const path = require('path')
const {app, BrowserWindow, ipcMain, Tray, nativeImage, Menu} = require('electron')
const {apiKey} = require('./config')

let tray
let window
let menu

app.setName("PocketSmith Balances")

app.on('ready', _ => {
  if (app.dock) app.dock.hide()

  tray = new Tray(path.join(__dirname, 'IconTemplate.png'))

  tray.setHighlightMode('never')

  tray.on('click', event => {
    window.isVisible() ? hide() : show()

    // Show devtools when ctrl clicked
    if (window.isVisible() && process.defaultApp && event.ctrlKey) {
      window.openDevTools({ mode: 'detach' })
    }
  })

  window = new BrowserWindow({
    width: 300,
    height: 300,
    show: false,
    frame: false,
    resizable: false,
    hasShadow: false,
    transparent: true
  })

  window.loadURL(`file://${path.join(__dirname, 'index.html')}`)

  window.on('blur', _ => {
    tray.setHighlightMode('never')

    const devToolsOpen = window.webContents.isDevToolsOpened()

    // Only close the window on blur if dev tools isn't opened
    if (!devToolsOpen) {
      hide()
    }
  })

  window.on('hide', _ => {
    tray.setHighlightMode('never')
  })

  window.on('focus', _ => {
    tray.setHighlightMode('always')
  })

  window.on('show', _ => {
    tray.setHighlightMode('always')
  })

  menu = Menu.buildFromTemplate([
    {
      role: 'quit'
    }
  ])
})

const show = _ => {
  positionWindow()
  window.show()
  window.focus()
}

const hide = _ => {
  window.hide()
}

const positionWindow = _ => {
  const trayBounds = tray.getBounds()
  const windowBounds = window.getBounds()

  let x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2))
  let y = Math.round(trayBounds.y + trayBounds.height)

  window.setPosition(x, y, false)

  window.webContents.send('show', window.getBounds(), trayBounds)
}

const get = endpoint => {
  return got(`https://api.pocketsmith.com/v2/${endpoint}`, {
    json: true, headers: { 'Authorization': `Key ${apiKey}` }
  }).then(response => {
    return response.body
  })
}

ipcMain.on('log', (event, ...args) => {
  console.log(...args)
})

ipcMain.on('get', (event, endpoint) => {
  get(endpoint).then(json => {
    event.sender.send('get-success', json)
  }).catch(error => {
    event.sender.send('get-fail', error)
  })
})

ipcMain.on('show-settings-menu', event => {
  menu.popup(window)
})
