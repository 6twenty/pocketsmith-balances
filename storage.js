const {app} = require('electron')
const fs = require('fs')
const path = require('path')
const dataFilePath = path.join(app.getPath('userData'), 'data.json')

let data = null

const load = _ => {
  if (data !== null) {
    return
  }

  if (!fs.existsSync(dataFilePath)) {
    data = {}
    return
  }

  data = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'))
}

const save = _ => {
  fs.writeFileSync(dataFilePath, JSON.stringify(data))
}

exports.set = (key, value) => {
  load()
  data[key] = value
  save()
}

exports.get = key => {
  load()

  if (key in data) {
    return data[key]
  } else {
    return null
  }
}

exports.unset = key => {
  load()
  
  if (key in data) {
    delete data[key]
    save()
  }
}
