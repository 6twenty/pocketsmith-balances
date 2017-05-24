const got = require('got')
const moment = require('moment')
const storage = require('./storage')
const {apiKey} = require('./config')

const get = endpoint => {
  return got(`https://api.pocketsmith.com/v2/${endpoint}`, {
    json: true, headers: { 'Authorization': `Key ${apiKey}` }
  }).then(response => {
    return response.body
  })
}

exports.fetch = async _ => {
  const store = storage.get(apiKey) || {}
  const lastFetch = store.lastFetch ? moment(store.lastFetch) : null
  const hourAgo = moment().subtract(1, 'hour')

  console.log('Fetching...')

  if (!store.user) {
    console.log('Fetching user...')
    store.user = await get('me')
    storage.set(apiKey, store)
  }

  // Limit fetching to once per hour max
  if (!store.accounts || lastFetch.isBefore(hourAgo)) {
    console.log('Fetching accounts...')
    store.lastFetch = moment().format()
    store.accounts = await get(`users/${store.user.id}/accounts`)
    storage.set(apiKey, store)
  }

  return {
    user: store.user,
    accounts: store.accounts
  }
}
