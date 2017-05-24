const path = require('path')
const {app, BrowserWindow, ipcMain, Tray, nativeImage, Menu, MenuItem} = require('electron')
const {apiKey} = require('./config')
const storage = require('./storage')(apiKey)

let user = storage.get('user')
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

    window.webContents.send('show', window.getBounds(), tray.getBounds())
  })

  if (!storage.has('netWorthEnabled')) {
    storage.set('netWorthEnabled', true)
  }

  const menuTemplate = [
    { type: 'separator' },
    {
      type: 'checkbox',
      label: 'Include Net Worth assets',
      checked: storage.get('netWorthEnabled'),
      click: (menuItem, browserWindow, event) => {
        window.webContents.send('toggle-net-worth', menuItem.checked)
        storage.set('netWorthEnabled', menuItem.checked)
      }
    },
    { type: 'separator' },
    {
      role: 'quit'
    }
  ]

  if (user) {
    menuTemplate.unshift({
      label: user.login,
      enabled: false
    })
  }

  menu = Menu.buildFromTemplate(menuTemplate)
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
}

ipcMain.on('log', (event, ...args) => {
  console.log(...args)
})

ipcMain.on('show-settings-menu', event => {
  const bounds = window.getBounds()
  const x = bounds.x + bounds.width - 70
  const y = bounds.y + bounds.height - 35

  menu.popup(window, { x: x, y: y })
})

ipcMain.once('fetched', (event, data) => {
  if (user) {
    return
  }

  const menuItem = new MenuItem({
    label: data.user.login,
    enabled: false
  })

  menu.insert(0, menuItem)
})
