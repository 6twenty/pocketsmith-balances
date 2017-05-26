const path = require('path')
const accounting = require('accounting-js')
const {app, BrowserWindow, ipcMain, Tray, nativeImage, Menu, MenuItem} = require('electron')
const api = require('./api')
const {apiKey} = require('./config')
const storage = require('./storage')(apiKey)

let user = storage.get('user')
let tray
let window
let menu

app.on('ready', _ => {
  if (app.dock) app.dock.hide()

  if (!storage.has('netWorthEnabled')) {
    storage.set('netWorthEnabled', true)
  }

  buildTray()
  buildWindow()
  buildMenu()
})

const buildTray = _ => {
  tray = new Tray(path.join(__dirname, 'IconTemplate.png'))

  tray.setHighlightMode('never')

  tray.on('click', event => {
    window.isVisible() ? hide() : show()

    // Show devtools when ctrl clicked
    if (window.isVisible() && process.defaultApp && event.ctrlKey) {
      window.openDevTools({ mode: 'detach' })
    }
  })
}

const buildWindow = _ => {
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

  window.on('ready-to-show', _ => {
    refresh(true)
  })

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

    refresh()
  })
}

const buildMenu = _ => {
  let netWorth

  if (user && user.net_worth) {
     netWorth = accounting.formatMoney(user.net_worth, {
      symbol: user.base_currency_code,
      format: user.using_multiple_currencies ? "%v %s" : "%v"
    })
  }

  menu = Menu.buildFromTemplate([
    {
      label: user ? `Connected as ${user.login}` : 'Connecting...',
      enabled: false
    },
    {
      label: netWorth ? `Net Worth: ${netWorth}` : '-',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Sync Now',
      click: (menuItem, browserWindow, event) => {
        refresh(true)
      }
    },
    {
      type: 'checkbox',
      label: 'Show Net Worth Assets',
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
  ])
}

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

const refresh = force => {
  window.webContents.send('will-refresh')

  api.fetch(force).then(data => {
    window.webContents.send('did-refresh', data)

    // If receiving an updated user, rebuild the menu
    if (data && data.user) {
      if (!user || user.net_worth != data.user.net_worth) {
        user = data.user
        buildMenu()
      }
    }
  })
}

ipcMain.on('show-settings-menu', event => {
  const bounds = window.getBounds()
  const x = bounds.width / 2
  const y = bounds.height - 20

  menu.popup(window, { x: x, y: y })
})
