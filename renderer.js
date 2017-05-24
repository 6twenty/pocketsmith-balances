const {ipcRenderer, shell, remote} = require('electron')
const accounting = require('accounting-js')
const moment = require('moment')

const log = (...args) => {
  ipcRenderer.send('log', ...args)
}

const render = data => {
  const {user, accounts, netWorthEnabled} = data
  const main = document.querySelector('main')
  const existing = main.querySelector('section')
  const section = document.createElement('section')

  log('Rendering...')

  // Remove existing markup first
  if (existing) {
    main.removeChild(existing)
  }

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

    el.dataset.networth = account.is_net_worth ? 1 : 0
    el.classList.add('account')
    title.classList.add('title')
    meta.classList.add('meta')
    balance.classList.add('balance')

    if (!netWorthEnabled && account.is_net_worth) {
      el.style.display = 'none'
    }

    title.appendChild(document.createTextNode(account.title))
    meta.appendChild(document.createTextNode(date))
    balance.appendChild(document.createTextNode(amount))

    el.appendChild(title)
    el.appendChild(meta)
    el.appendChild(balance)
    section.appendChild(el)
  })

  main.insertBefore(section, main.firstChild);
}

let isFetching = false

const fetch = force => {
  if (isFetching) {
    return
  }

  isFetching = true

  return remote.require('./api').fetch(force).then(data => {
    isFetching = false

    ipcRenderer.send('fetched', data)

    return data
  })
}

const align = (windowBounds, trayBounds) => {
  const offset = trayBounds.x - windowBounds.x + (trayBounds.width / 2) - 10
  const arrow = document.querySelector('.arrow')

  log('Realigning...')

  arrow.style.left = `${offset}px`
  arrow.style.display = 'block'
}

const handleShow = (_, windowBounds, trayBounds) => {
  align(windowBounds, trayBounds)

  refresh()
}

const refresh = (_, force) => {
  fetch(force).then(render)
}

const toggleNetWorth = (_, enabled) => {
  document.querySelectorAll('.account').forEach(el => {
    if (el.dataset.networth === '1') {
      el.style.display = enabled ? 'block' : 'none'
    }
  })
}

document.querySelector('footer a.website').addEventListener('click', e => {
  e.preventDefault()
  shell.openExternal(e.target.href)
})

document.querySelector('footer a.settings').addEventListener('click', e => {
  ipcRenderer.send('show-settings-menu')
})

ipcRenderer.on('show', handleShow)
ipcRenderer.on('refresh', refresh)
ipcRenderer.on('toggle-net-worth', toggleNetWorth)

refresh()
