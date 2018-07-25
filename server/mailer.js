'use strict'

const Mail       = require('./mail')
const config     = require('../config')
const AWS        = require('aws-sdk');
const SES        = new AWS.SES();
const axios      = require('axios')

AWS.config.update({ region: 'us-east-1' });

/**
 * @class Mailer
 * @desc Send mail using amazon SES.
 */

class Mailer {
  constructor () {
    this._fromAddr = config.application.from_addr;
  }

  /**
   * send
   * 
   * @desc Send mail.
   * @public
   * 
   * @param {String} destination email
   * @param {String} email title
   * @param {String} html body
   * 
   * @return void
   */

  send (destination, title, body) {
    return new Promise( async (resolve, reject) => {
      let mail = new Mail(destination, title, body, this._fromAddr).toJSON();
      try {
        await SES.sendEmail(mail).promise();
        return resolve();
      }
      catch (err) {
        let bounced = false;
        switch (err.code) {

         /*
          * 400 Error - Bounced Emails
          * 
          * If an email address bounces, we shouldn't continue sending 
          * email to it again. We need a way to avoid this.
          */

          case "MessageRejected":
            console.log(`[Mailer] Mail to ${destination} bounced.`)
            bounced = true;
            return;

          /*
            * Any other form of email failure that occurs, we want
            * to report this failure to our Slack channel. 
            */

          default:
            console.log(err)
            this._alertMaintainers(err);
            return;
        }
        this._alertMaintainers(err);
        return reject(err)
      }
    })
  }

  /**
   * _alertMaintainers
   * 
   * @desc Alerts the maintainers that there was a problem 
   * sending mail.
   * @private
   * 
   * @param {Error}
   * 
   */

  async _alertMaintainers (err) {
    console.log(`[Mailer]: TRANSMISSION FAILURE - Error sending email.`)
    console.log(`[Mailer]: Error: ${err}`)

    // Notify slack
    if (process.env.NODE_ENV !== "dev") {
      const options = {
        text: `[Mailer]: An error just occurred in ${process.env.NODE_ENV}
          \n[Mailer]: Error: ${err}`,
        channel: '#mailer'
      }

      try {
        let response;
        response = await axios.post(config.slack.webhook_url, JSON.stringify(options))
        console.log('SUCCEEDED: Sent slack webhook: \n', response.data);
      }
      catch (err) {
        console.log('FAILED: Send slack webhook', err);
      }
    }
  }
}

module.exports = Mailer;
        

        