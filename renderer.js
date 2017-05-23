// In renderer process (web page).
const {ipcRenderer, shell} = require('electron')
const accounting = require('accounting-js')
const moment = require('moment')

const log = (...args) => {
  ipcRenderer.send('log', ...args)
}

const get = endpoint => {
  const channelSuccess = `get-success`
  const channelFail = `get-fail`

  const done = _ => {
    ipcRenderer.removeAllListeners(channelSuccess)
    ipcRenderer.removeAllListeners(channelFail)
    return true
  }

  return new Promise((resolve, reject) => {
    ipcRenderer.once(channelSuccess, (event, data) => done() && resolve(data))
    ipcRenderer.once(channelFail, (event, error) => done() && reject(error))
    ipcRenderer.send('get', endpoint)
  })
}

const renderAccounts = (user, accounts) => {
  const section = document.querySelector('section')

  log('Rendering...')

  // Remove any existing markup first
  section.querySelectorAll('.account').forEach(el => {
    section.removeChild(el)
  })

  accounts.forEach(account => {
    const el = document.createElement('div')
    const title = document.createElement('div')
    const meta = document.createElement('div')
    const balance = document.createElement('div')
    const date = moment(account.current_balance_date, 'YYYY-MM-DD').format('MMM D, YYYY')
    const amount = accounting.formatMoney(account.current_balance, {
      symbol: account.currency_code,
      format: user.using_multiple_currencies ? "%v %s" : "%v"
    })

    el.classList.add('account')
    title.classList.add('title')
    meta.classList.add('meta')
    balance.classList.add('balance')

    title.appendChild(document.createTextNode(account.title))
    meta.appendChild(document.createTextNode(date))
    balance.appendChild(document.createTextNode(amount))

    el.appendChild(title)
    el.appendChild(meta)
    el.appendChild(balance)
    section.appendChild(el)
  })
}

const refresh = _ => {
  log('Refreshing...')
  get('me').then(json => get(`users/${json.id}/accounts`).then(renderAccounts.bind(this, json)))
}

refresh()

const realign = (_, windowBounds, trayBounds) => {
  log('Realigning...')

  const offset = trayBounds.x - windowBounds.x + (trayBounds.width / 2) - 10
  const arrow = document.querySelector('.arrow')

  arrow.style.left = `${offset}px`
  arrow.style.display = 'block'
}

document.querySelector('footer a.website').addEventListener('click', e => {
  e.preventDefault()
  shell.openExternal(e.target.href)
})

document.querySelector('footer a.settings').addEventListener('click', e => {
  ipcRenderer.send('show-settings-menu')
})

ipcRenderer.on('show', realign)
