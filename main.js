const electron = require('electron')
const menubar = require('menubar')

// Module to control application life.
const app = electron.app

app.log = (...args) => {
  console.log(...args)
}

const mb = menubar()
