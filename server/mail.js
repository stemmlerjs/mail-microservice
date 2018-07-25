'use strict'

const config     = require('../config')

function Mail (toEmail, subject, html, replyTo) {
  this.toEmail = toEmail;
  this.from = config.application.from_addr;
  this.subject = subject;
  this.html = html;
  this.replyTo = replyTo;
}

Mail.prototype.toJSON = function () {
  return {
    Destination: { /* required */
      ToAddresses: [
        this.toEmail
      ]
    },
    ReplyToAddresses: [
      this.replyTo
    ], 
    Message: { /* required */
      Body: { /* required */
        Html: {
          Charset: "UTF-8",
          Data: this.html
        }
      },
      Subject: {
        Charset: 'UTF-8',
        Data: this.subject
      }
      },
    Source: this.from, /* required */
  }
}

module.exports = Mail;