
  // univjobs-mailer

  const nodemailer = require('nodemailer');
  const axios      = require('axios')
  const helpers    = require('./helpers')
  const config     = require('./config')
  const Queue      = require('./queue')
  const queue      = new Queue();
  const mysql      = require('mysql')


 /*
  * @class Mailer
  * @description The Mailer class is a finite state machine that reads from the mail
  * queue in the univjobs database within the 'email_tracker' table and mails them 
  * out.
  */

  class Mailer {

    constructor () {
      // Create transporter to be used to send all mail.
      this.transporter = nodemailer.createTransport( process.env.UNIVJOBS_TRANSPORT_SMTP )

      // Setup the db connnection
      this.dbConnection = config.db.getConnection();

      // Refresh rate (ms) to check for new emails in the queue.
      this.refreshRate = config.application.refresh_rate_milliseconds;
      this.MAX_DB_CONNECTION_ATTEMPTS = 10;
      this.dbConnectionAttempts = 0;
      this.INTER_TRANSMISSION_MAX_SECONDS = config.application.service_interval_time_seconds;

      console.log('[Mailer]: Starting. Calling init().')      
      this.init()

    }

   /*
    * init
    * 
    * STATE 1 - INIT. We need to be able to connect to the database.
    * After being able to connect, we can move to the CONNECTED state.
    *
    */

    init () {

      this.dbConnection.query('SELECT 1 + 1 AS solution', (error, results, fields) => {
        
       /*
        * If we had trouble connecting, we'll wait a few seconds before retrying to connect.
        */

        if (error) {

          /*
           * We'll have to increment the dbConnectionAttempts everytime that we
           * fail to connect.
           */

          if (this.dbConnectionAttempts < this.MAX_DB_CONNECTION_ATTEMPTS) {

            this.dbConnectionAttempts = this.dbConnectionAttempts + 1

            console.log(`[Mailer]: INIT - failed to connect to database at ${config.db.host}. ${this.dbConnectionAttempts} / ${this.MAX_DB_CONNECTION_ATTEMPTS} before killing process. Retrying in 2000 ms.`)

            setTimeout(() => {
              this.init();
            }, 2000)

          }

          /*
           * If we fail to connect the MAX amount of times, we have to then 
           * exit and send an email to the maintainers.
           */

          else {
            this.emailMaintainers(emailTemplates.DB_CONNECTION_FAILED, () => {

              this.exitWithError('Database connection attempts exceeded');

            })


          }

          
        }

       /*
        * We were able to connect to the database, let's move into the CONNECTED state.
        */

        else {

          this.dbConnectionAttempts = 0;

          console.log(`[Mailer]: INIT - Successfully connected to DB at ${config.db.host}. Moving to CONNECTED state.`)

          this.connected(true)

        }
        
      });

    }


   /*
    * connected
    *
    * STATE 2 - CONNECTED. In this state, we just constantly check for queued emails
    * to send out.
    */

    async connected (print) {

      if (print) {
        console.log(`[Mailer]: CONNECTED - Checking queue every ${this.refreshRate} ms.`)
      }

      /*
       * Update the queue for new emails.
       */
      
      try {
        await queue.update();

        /*
         * If the queue is empty, then we check back every 
         * {refresh rate} seconds.
         */

        if (queue.isEmpty()) {
          setTimeout(() => {

            // We don't need to print "connected" every time
            // so we don't pass true.
            this.connected()

          }, this.refreshRate)
        }

        /*
         * The queue is not empty, we have some work to do.
         * We will get the next item in the queue, send it 
         * and update mysql.
         */

        else {
          
          let mail;
          
          try {
            mail = await queue.leave();
          }

          catch (err) {
            console.log(err);
          }
          

          /*
           * If the next mailed item is null, 
           * it means that we weren't able to extract
           * an item from the queue because
           * 
           * We've exceeded the total number of emails per hour
           * and we're waiting until appropriate to send
           * more. 
           * 
           * All of the slots in the queue have been reserved.
           */

          if (mail == null) {
            setTimeout(() => {

              // We don't need to print "connected" every time
              // so we don't pass true.
              this.connected()

            }, this.refreshRate)
          }

          /*
           * Ready to send mail.
           * 
           * We will go ahead and send one email out.
           */

          else {

            this.transmission(mail);

          }


        }
      }

      /*
       * Couldn't update the queue for some reason.
       * One or more of our sql queries failed.
       * 
       * This is a critical error.
       */

      catch (err) {
        console.log(err);
        helpers.sendCriticalErrorMessage(err);
      }

    }

   /*
    * transmission
    *
    * STATE 3 - TRANSMISSION. This state is for sending a single email.
    *
    * Here, we send the email and then we log the result of trying to 
    * send that email in the queue.
    */

    async transmission (mail) {
      
      console.log(`[Transmission]: Sending an email of type = ${mail.email_type}`);

      let mailResult;
      let randomQueueInterval = Math.random() * 1000 * this.INTER_TRANSMISSION_MAX_SECONDS;
      let successUpdateStatement;
      let failureUpdateStatement;
      let bouncedUpdateStatement;

      try {
        console.log(`[Mailer]: Waiting ${randomQueueInterval} before sending...`)
        await helpers.timeout(randomQueueInterval);
        console.log(`[Mailer]: Sending after waiting ${randomQueueInterval}`)
        mailResult = await helpers.sendMessage(mail, this.transporter);

        // Successfully sent the mail.

        console.log(`[Mailer]: Sent successfully to ${mail.destination_email }.`);
      }

      // If it failed to send, 
      // We'll let it fail here and then attempt again on the next round
      // through.

      catch (err) {
        console.log(err)
        console.log(`[Mailer]: Failed to send mail to ${err.q.destination_email }. 
        >>> Reattempts = ${err.attempts}
        >>> Reason = ${err.reason}
        >>> Bounced? = ${err.bounced}`);
      }


     /*
      * After all promises have been sent and resolved, we will
      * then need to say which of these were successful and which of these had failed.
      */
     
      successUpdateStatement = "";
      failureUpdateStatement = "";
      bouncedUpdateStatement = "";

      if (mailResult.success) {
        successUpdateStatement += mysql.format(`UPDATE email_tracker SET status = "SENT" WHERE id = ${mail.id}; `);
      }

      else {
        failureUpdateStatement += mysql.format(`UPDATE email_tracker SET attempts = ${attempts + 1} WHERE id = ${mail.id}; `);

        if (mailResult.bounced) {
          bouncedUpdateStatement += mysql.format(`UPDATE email_tracker SET bounced = 1 WHERE id = ${mail.id}; `);
        }
      }

     /*
      * Now, we perform the update statements.
      */
      let updatePromises = [];

      if (successUpdateStatement !== "") {
        updatePromises.push(
          new Promise((resolve, reject) => {
            this.dbConnection.query(successUpdateStatement, (error, queue, fields) => {

              console.log(`[Mailer]: Updated - SQL written for this successful email.`)

              resolve()

            })
          })
        )
      }

      if (failureUpdateStatement != "") {
        updatePromises.push(
          new Promise((resolve, reject) => {
            this.dbConnection.query(failureUpdateStatement, (error, queue, fields) => {

              // console.log(error)

              console.log(`[Mailer]: Updated - SQL written for this failed email.`)

              resolve()

            })
          })
        )
      }

      if (bouncedUpdateStatement != "") {
        updatePromises.push(
          new Promise((resolve, reject) => {
            this.dbConnection.query(bouncedUpdateStatement, (error, queue, fields) => {

              // console.log(error)

              console.log(`[Mailer]: Updated - SQL written for this bounced email.`)

              resolve()

            })
          })
        )
      }

      /*
      * Now, we go back to the regular connection state.
      */

      try {
        await Promise.all(updatePromises);
        console.log(`[Mailer]: TRANSMISSION - Going back into CONNECTED state.`)
        this.connected(true);
      }

      /*
       * Update error. This is a critical error. 
       * If this happens (which it should never), we need to be
       * updated and check the logs on why this happened.
       */
      
      catch (err) {
        helpers.sendCriticalErrorMessage(err);
      }
    }

    exitWithError (error) {

      console.log(error)
      process.exit(1)

    }

    emailMaintainers (body, callback) {

      /*
       * Create an array of promises to hold the email promises in.
       */

      var allMaintainerPromises = [];

      config.maintainers.forEach((maintainerEmail) => {

        let randomQueueInterval = Math.random() * 1000 * 15;

        var promise = new Promise((resolve, reject) => {

          var mailOptions = {
            from: '"Univjobs Mailer" <univjobscanada@gmail.com>',
            to: maintainerEmail,
            subject: "Univjobs Mailer - IMPORTANT UPDATE",
            html: body
          }

          function handleMail(err, info) {
            /*
            * Something went wrong while trying to send this particular
            * queued item.
            */

            if (err) {

              console.log(`[Mailer]: MAINTAINER NOTIFICATION EMAIL FAILURE - Couldn't inform maintainer=${maintainerEmail}`)
              console.log(`[Mailer]: Error: ${err.toString()}, ${info}`)

              resolve({
                success: false,
                reason: err
              })

            }

           /* 
            * Successfully sent queued item.
            * Add the success result to the promise resolution.
            */

            else {

              console.log(`[Mailer]: MAINTAINER NOTIFICATION EMAIL SUCCESS - Informed maintainer=${maintainerEmail}`)

              resolve({
                success: true
              })

            }
          }

          /*
           * Send the mail given a random
           * queue interval between 0 and 15 seconds.
           */

            setTimeout(() => {
              this.transporter.sendMail(mailOptions, handleMail)
            }, randomQueueInterval)
        })

        allMaintainerPromises.push(promise)

      })

      /*
       * Whether the emails were able to be sent or not, we
       * need to kill the process so that PM2 can restart it.
       */

      Promise.all(allMaintainerPromises)

        .then(() => {

          callback()

        })

        .catch((err) => {

          callback()
        })

    }

    getMaxDBConnectionAttempts () {
      return this.MAX_DB_CONNECTION_ATTEMPTS
    }


  }


// Create the Mailer instance. Handle any errors as they occur.
const mailerInstance = new Mailer()

const emailTemplates = {

  DB_CONNECTION_FAILED: `The mailer running on ENV=${process.env.CURRENT_ENV} couldn't connect to the database after
    ${mailerInstance.getMaxDBConnectionAttempts()} attempts. Mailer process killed and restarted.
  `,

  UNCAUGHT_EXCEPTION: (err) => {
    return `The mailer running on ENV=${process.env.CURRENT_ENV} ran into an uncaught exception and restarted. The 
    exception was ${err.toString()}.`
  }

}

/* 
 * ==================================================================================
 * On any uncaught errors, we'll notify the maintainers and we'll restart the server.
 * ==================================================================================
 */
 

