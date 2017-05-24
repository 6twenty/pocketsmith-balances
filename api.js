const got = require('got')
const moment = require('moment')
const {apiKey} = require('./config')
const storage = require('./storage')(apiKey)

const get = endpoint => {
  return got(`https://api.pocketsmith.com/v2/${endpoint}`, {
    json: true, headers: { 'Authorization': `Key ${apiKey}` }
  }).then(response => {
    return response.body
  })
}

exports.fetch = async _ => {
  let user = storage.get('user')
  let accounts = storage.get('accounts')
  let lastFetch = storage.get('lastFetch')

  const lastFetchTime = lastFetch ? moment(lastFetch) : null
  const oneHourAgo = moment().subtract(1, 'hour')

  console.log('Fetching...')

  if (!user) {
    console.log('Fetching user...')

    user = await get('me')

    storage.set('user', user)
  }

  // Limit fetching to once per hour max
  if (!accounts || lastFetchTime.isBefore(oneHourAgo)) {
    console.log('Fetching accounts...')

    lastFetch = moment().format()
    accounts = await get(`users/${user.id}/accounts`)

    storage.set('lastFetch', lastFetch)
    storage.set('accounts', accounts)
  }

  return storage.all()
}
