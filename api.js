const got = require('got')
const moment = require('moment')
const crypto = require('crypto')
const storage = require('./storage')
const {apiKey} = require('./config')
const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex')

const get = endpoint => {
  return got(`https://api.pocketsmith.com/v2/${endpoint}`, {
    json: true, headers: { 'Authorization': `Key ${apiKey}` }
  }).then(response => {
    return response.body
  })
}

exports.fetch = async _ => {
  const store = storage.get(hashedKey) || {}
  const lastFetch = store.lastFetch ? moment(store.lastFetch) : null
  const hourAgo = moment().subtract(1, 'hour')

  console.log('Fetching...')

  if (!store.user) {
    console.log('Fetching user...')
    store.user = await get('me')
    storage.set(hashedKey, store)
  }

  // Limit fetching to once per hour max
  if (!store.accounts || lastFetch.isBefore(hourAgo)) {
    console.log('Fetching accounts...')
    store.lastFetch = moment().format()
    store.accounts = await get(`users/${store.user.id}/accounts`)
    storage.set(hashedKey, store)
  }

  return {
    user: store.user,
    accounts: store.accounts
  }
}
