'use strict'

const yml = require('config-yml')

module.exports = {
  fromAddr: yml.from_addr,
  maintainers: ['metroidman12@gmail.com', 'charlesjavelona@gmail.com'],
  slack: {
    webhook_url: 'https://hooks.slack.com/services/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',
    payload: {
      "channel":"#mailer", 
      "text": "This is a line of text in a channel.\nAnd this is another line of text."
    }
  },
  application: yml.application
}
