const got = require('got')
const moment = require('moment')
const money = require('money')
const {apiKey} = require('./config')
const storage = require('./storage')(apiKey)

let isFetching = false

const get = endpoint => {
  return got(`https://api.pocketsmith.com/v2/${endpoint}`, {
    json: true, headers: { 'Authorization': `Key ${apiKey}` }
  }).then(response => response.body)
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

    if (!user) {
      console.log('Fetching user...')

      user = await get('me')

      storage.set('user', user)

      console.log(' > Done')
    }

    // Limit fetching to once per hour max
    if (!lastFetch || force || lastFetchTime.isBefore(oneHourAgo)) {
      console.log('Fetching accounts...')

      lastFetch = moment().format()
      accounts = await get(`users/${user.id}/accounts`)

      storage.set('lastFetch', lastFetch)

      isFetching = false

      if (user.using_multiple_currencies) {
        const currencies = accounts.map(account => account.currency_code.toUpperCase())
        const url = `https://api.fixer.io/latest?symbols=${currencies.join(',')}`
        const data = await got(url, { json: true }).then(response => response.body)

        money.rates = data.rates
        money.rates[data.base] = 1

        user.net_worth = accounts.reduce((sum, account) => {
          try {
            return sum + money(account.current_balance)
              .from(account.currency_code.toUpperCase())
              .to(user.base_currency_code.toUpperCase())
          } catch (e) {
            // Er, just skip this account I guess
            return sum
          }
        }, 0)
      } else {
        user.net_worth = accounts.reduce((sum, account) => {
          return sum + account.current_balance
        }, 0)
      }

      storage.set('user', user)

      console.log(' > Done')

      return Object.assign({}, storage.all(), { accounts: accounts })
    }

    isFetching = false
  } catch(e) {
    isFetching = false

    console.log('Error fetching from API:', e)
  }
}
