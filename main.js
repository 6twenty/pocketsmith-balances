const got = require('got')
const path = require('path')
const {app, BrowserWindow, ipcMain, Tray, nativeImage} = require('electron')
const {apiKey} = require('./config')

let tray
let window

app.on('ready', _ => {
  if (app.dock) app.dock.hide()

  // Setup the menubar with an icon
  tray = new Tray(path.join(__dirname, 'IconTemplate.png'))

  tray.setHighlightMode('never')

  // Add a click handler so that when the user clicks on the menubar icon, it shows
  // our popup window
  tray.on('click', function(event) {
    toggleWindow()

    // Show devtools when command clicked
    if (window.isVisible() && process.defaultApp && event.ctrlKey) {
      window.openDevTools({ mode: 'detach' })
    }
  })

  // Make the popup window for the menubar
  window = new BrowserWindow({
    width: 300,
    height: 300,
    show: false,
    frame: false,
    resizable: false,
    transparent: true,
    shadow: false
  })

  // Tell the popup window to load our index.html file
  window.loadURL(`file://${path.join(__dirname, 'index.html')}`)

  // Only close the window on blur if dev tools isn't opened
  window.on('blur', _ => {
    tray.setHighlightMode('never')
    if (!window.webContents.isDevToolsOpened()) {
      window.hide()
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
    window.webContents.send('refresh')
  })
})

const toggleWindow = _ => {
  if (window.isVisible()) {
    window.hide()
  } else {
    showWindow()
  }
}

const showWindow = _ => {
  const trayBounds = tray.getBounds()
  const windowBounds = window.getBounds()

  let x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2))
  let y = Math.round(trayBounds.y + trayBounds.height)

  window.setPosition(x, y, false)
  window.show()
  window.focus()
}

const get = endpoint => {
  return got(`https://api.pocketsmith.com/v2/${endpoint}`, {
    json: true, headers: { 'Authorization': `Key ${apiKey}` }
  }).then(response => {
    return response.body
  })
}

ipcMain.on('log', (event, message) => {
  console.log(message)
})

ipcMain.on('get', (event, endpoint) => {
  get(endpoint).then(json => {
    event.sender.send('get-success', json)
  }).catch(error => {
    event.sender.send('get-fail', error)
  })
})

ipcMain.on('resize', (event, {width, height}, animate) => {
  const bounds = window.getBounds()
  const offset = (width - bounds.width) / 2

  window.setBounds({
    width: width,
    height: height,
    x: bounds.x - offset,
    y: bounds.y
  }, animate)
})
