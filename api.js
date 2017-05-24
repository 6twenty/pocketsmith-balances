const got = require('got')
const moment = require('moment')
const {apiKey} = require('./config')
const storage = require('./storage')(apiKey)

// Cleanup legacy data
storage.del('accounts')

let isFetching = false

const get = endpoint => {
  return got(`https://api.pocketsmith.com/v2/${endpoint}`, {
    json: true, headers: { 'Authorization': `Key ${apiKey}` }
  }).then(response => {
    return response.body
  })
}

exports.fetch = async force => {
  try {
    if (isFetching) {
      return
    }

    isFetching = true

    let user = storage.get('user')
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
    if (!lastFetch || force || lastFetchTime.isBefore(oneHourAgo)) {
      console.log('Fetching accounts...')

      lastFetch = moment().format()
      accounts = await get(`users/${user.id}/accounts`)

      storage.set('lastFetch', lastFetch)

      isFetching = false

      return Object.assign(storage.all(), { accounts: accounts })
    }

    isFetching = false
  } catch(e) {
    isFetching = false

    console.log('Error fetching from API:', e)
  }
}
