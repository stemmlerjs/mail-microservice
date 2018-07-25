
const config      = require('./config')
const api_key     = process.env.MAILGUN_API_KEY;
const AWS        = require('aws-sdk');
const SES        =  new AWS.SES();
const axios      = require('axios')

AWS.config.update({ region: 'us-east-1' });

function MailParameters (toEmail, subject, html, replyTo) {
  this.toEmail = toEmail;
  this.from = '"Univjobs Team" <contact@univjobs.ca>'
  this.subject = subject;
  this.html = html;
  this.replyTo = replyTo;
}

MailParameters.prototype.toJSON = function () {
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


module.exports = {

  /*
   * sendMessage
   *
   * Sends one message out.
   *
   * @param {Object} message config
   * @param 
   */

  sendMessage: function (q, transport) {
    return new Promise(async (resolve, reject) => {

      /*
       * Some edge thing that we've found.
       */

      if (q.message_body.toString('utf-8') == undefined) {
        console.log('heres whats failing', q.destination_email);
      }

      let mailOptions = new MailParameters(
        q.destination_email, 
        q.message_title, 
        q.message_body.toString(),
        q.reply_to
      ).toJSON();

      /*
       * Send the mail given a random
       * queue interval between 0 and 15 seconds.
       */

      let sendPromise;

      try {
        sendPromise = await SES.sendEmail(mailOptions).promise();

        /* 
         * Successfully sent the mail.
         */

        console.log(
          `[Mailer]: TRANSMISSION SUCCESS - Sent type=${q.email_type}, recipient=${q.destination_email}, originator=${q.originator_user_id}`
        );
        resolve({
          success: true,
          id: q.id
        })
      }

     /*
      * Failed to send the mail.
      */

      catch (err) {
        debugger;
        let bounced = false;

        switch (err.message) {

          /*
            * 400 Error - Bounced Emails
            * 
            * If an email address bounces, we shouldn't continue sending 
            * email to it again. We need a way to avoid this.
            */

          case "'to' parameter is not a valid address. please check documentation":
            bounced = true;
            break ;

          /*
            * Any other form of email failure that occurs, we want
            * to report this failure to our Slack channel. 
            */

          default:
            console.log(`[Mailer]: TRANSMISSION FAILURE - Error sending type=${q.email_type}, 
              recipient=${q.destination_email}, originator=${q.originator_user_id}`)
            console.log(`[Mailer]: Error: ${err}`)

            // Notify slack
            if (process.env.CURRENT_ENV !== "dev") {
              const options = {
                text: `[Mailer]: TRANSMISSION FAILURE - Error sending type=${q.email_type}, 
                  recipient=${q.destination_email}, originator=${q.originator_user_id}
                  \n[Mailer]: Error: ${err}`,
                channel: '#mailer'
              }

              /*
                * Send the slack notification to our channel
                * so that we can be alerted when things are failing without our knowing.
                */

              axios.post(config.slack.webhook_url, JSON.stringify(options))
                .then((response) => {
                  console.log('SUCCEEDED: Sent slack webhook: \n', response.data);
                })
                .catch((error) => {
                  console.log('FAILED: Send slack webhook', error);
                });
            }
            break;
        }

        reject({
          success: false,
          reason: err,
          id: q.id,
          attempts: q.attempts,
          bounced: bounced,
          q: q
        })
      }
    })
  },

  sendCriticalErrorMessage: (err) => {
    axios.post(config.slack.webhook_url, 
      JSON.stringify(err)
    )
    .then((response) => {
      console.log('SUCCEEDED: Sent slack webhook: \n', response.data);
    })
    .catch((error) => {
      console.log('FAILED: Send slack webhook', error);
    });
  },

  timeout: (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}