
const Mail         = require('./mail')
const config       = require('./config')

class Reporter {

  constructor(maxEmailPerHour, maxVerifiedEmailsPerHour, logInterval) {
    // In this case, the email provide only allows 100
    this.maxEmailPerHour            = maxEmailPerHour; 
    this.maxVerifiedEmailsPerHour   = maxVerifiedEmailsPerHour;
    this.logInterval                = logInterval;
    this.dbConnection               = config.db.getConnection();
  }


  /* printStatus
   *
   * Prints the queue status derived from db? 
   * It checks every 10 seconds and then outputs to console log the status.
   *
    * */
    
  printStatus() {
    //TODO: Print every 10 seconds
    // 

    console.log(`[Reporter]: Displaying current queue status:
    >>> Hourly Signups This Hour = ${this.getHourlySignupsCount(this.dbConnection)} / ${this.allowedEmailsThisHour()}
    >>> Total Max Emails Per Hour = [${this.maxEmailPerHour}/??]
    >>> Total Max Priority Emails Per hour [${this.maxVerifiedEmailsPerHour}/??]
    `)  
  }


  /* allowedEmailsThisHour
   * 
   * Returns the difference between maxEmailPerHour and maxVerifyPerHour
   *
   * 
   * */
  
  allowedEmailsThisHour() {
    return this.maxEmailPerHour - this.maxVerifiedEmailsPerHour
  }

  /*
   * getHourlySignupsCount
   * 
   * Get hourly signup this hour.
   * 
   * @param {Object} db connection
   */

  getHourlySignupsCount(conn) {
    return new Promise((resolve, reject) => {
      conn.query(` 
          SELECT COUNT(*)
          FROM email_tracker 
          WHERE email_type = "VERIFY_EMAIL"
          AND updated_at >=  DATE_SUB(NOW(), INTERVAL 1 HOUR)
          AND status = "SENT";  `,
      (error, mail, fields) => {
        if (error) {
          reject(error);
        }
        else {
          resolve(mail[0]['COUNT(*)'])
        }
      })
    })
  }

  /*
   * getRegularMailSentCount
   * 
   * This executes a sql statement that returns all the other emails that are not email verified
   * 
   * @param {Object} db connection
   */

  getRegularMailSentCount(conn) {
    return new Promise((resolve, reject) => {

      conn.query(` 
        SELECT COUNT(*)
          FROM email_tracker 
          WHERE email_type != "VERIFY_EMAIL"
          AND updated_at >=  DATE_SUB(NOW(), INTERVAL 1 HOUR)
          AND status = "SENT"; `, 
      (error, mail, fields) => {

        if (error) {
          reject(error);
        }

        else {
          resolve(mail[0]['COUNT(*)'])
        }

      })
    })
  }
}

let reporterInstance = null;

module.exports = {
  getInstance: () => {
    if (reporterInstance == null) {
      reporterInstance = new Reporter();
      return reporterInstance
    }
    else {
      return reporterInstance;
    }
  }
}

