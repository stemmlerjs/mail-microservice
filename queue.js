

const Mail         = require('./mail')
const config       = require('./config')
const reporter     = require('./reporter').getInstance();

class Queue {
  constructor () {
    // Priority queue holds all of the verify emails types
    this.priorityQueue = [];
    // Regular queue holds all of the other email types
    this.regularQueue = [];
    this.dbConnection = config.db.getConnection();
  }

  isEmpty () {
    return this.priorityQueue.length == 0 && this.regularQueue.length == 0;
  }

  /*
   * leave
   * 
   * Returns the next email to send out in the queue.
   * 
   * If the priority queue has email in it, we will always pop
   * this one first before popping from the other queue.
   * 
   * Now, we will only 
   * 
   * @return {Mail}
   */

  leave () {
    let numPriorityEmailsSentThisHour;
    let numRegularEmailsSentThisHour;

    return new Promise(async (resolve, reject) => {

      try {
        numPriorityEmailsSentThisHour = await reporter.getHourlySignupsCount(this.dbConnection);
        numRegularEmailsSentThisHour = await reporter.getRegularMailSentCount(this.dbConnection);

        if (this.priorityQueue.length !== 0) {
          if (numPriorityEmailsSentThisHour < config.mail.rate.verifiy_emails_per_hour) {

            console.log(`[Queue]: Leave()
            >>> Leaving one item from the Priority Queue.
            >>> Current PQ length before leave = [${this.priorityQueue.length}]
            >>> Number of Priority emails sent this hour = [${numPriorityEmailsSentThisHour}/${config.mail.rate.verifiy_emails_per_hour}]`)

            /*
            * If the priority queue is not empty and there are
            * are still emails left for it to send this hour because
            * we haven't exceeded the hourly rate yet, then we will leave
            * one of these from the front of the queue.
            */

            let next = this.priorityQueue.shift();
            resolve(next);
            return;
          }
        }

        if (this.regularQueue.length !== 0) {
          if (numRegularEmailsSentThisHour < (config.mail.rate.max_emails_per_hour - config.mail.rate.verifiy_emails_per_hour) ) {

            console.log(`[Queue]: Leave()
            >>> Leaving one item from the Regular Queue.
            >>> Current RQ length before leave = [${this.regularQueue.length}]
            >>> Number of Regular emails sent this hour = [${numRegularEmailsSentThisHour}/${(config.mail.rate.max_emails_per_hour - config.mail.rate.verifiy_emails_per_hour)}]`)

            /*
            * If there are emails in the regular queue and there is still
            * room to send email, we will go ahead and leave one of these from
            * the front of the regular queue.
            */

            let next = this.regularQueue.shift();
            resolve(next);
            return;
          }
        }

        // console.log(`[Queue]: Leave()
        // >>> No item to leave either queue.
        // >>> PQ: [${numPriorityEmailsSentThisHour}/${config.mail.rate.verifiy_emails_per_hour}]
        // >>> RQ: [${numRegularEmailsSentThisHour}/${(config.mail.rate.max_emails_per_hour - config.mail.rate.verifiy_emails_per_hour)}]`)

        resolve(null);
      }

      catch (err) {
        console.log(err)
        reject(err);
      }

    })
  }

  /*
   * length
   * 
   * Returns the length of the queues where the 
   * first index if the priority queue length
   * and the second index is the regular queue length.
   * 
   * @return {Array}
   */

  getLength () {
    return [this.priorityQueue.length, this.regularQueue.length];
  }

  /*
   * update
   * 
   * Updates the queue to check for new emails to send.
   * 
   * @return Void
   */

  update () {

    let priorityMail;
    let regularMail;

    return new Promise( async (resolve, reject) => {
      try {
        priorityMail  = await getPriorityMail(this.dbConnection) ;
        regularMail   = await getRegularMail (this.dbConnection) ;
      }

      catch (err) {
        return reject(err);
      }
      
      // Now, we add the priority mail that isn't in our priority queue to the 
      // end of our priority queue.

      priorityMail.forEach((pm) => {
        if (!isInQueue(this.priorityQueue, pm)) {
          this.priorityQueue.push(pm);
        }
      })

      // We also add the regular mail that isn't in our regular queue to the end
      // of our regular queue.

      regularMail.forEach((rm) => {
        if (!isInQueue(this.regularQueue, rm)) {
          this.regularQueue.push(rm);
        }
      })

      resolve();
      
    })

  }
}

/*
 * getPriorityMail
 * 
 * Returns a list of all of the priority mail that currently
 * exists.
 * 
 * @return {Array <Mail> }
 */

function getPriorityMail (conn) {
  return new Promise((resolve, reject) => {

    conn.query(`SELECT * 
      FROM email_tracker 
      WHERE status = "QUEUED" 
      AND attempts < 5 
      AND bounced = 0
      AND email_type = "VERIFY_EMAIL"; `, 
    (error, mail, fields) => {

      if (error) {
        reject(error);
      }

      else {
        resolve(mail)
      }

    })

  })
}

/*
 * getRegularMail
 * 
 * Returns a list of all the regular mail the currently
 * exists in the db to send.
 * 
 * @return {Array <Mail> }
 */

function getRegularMail (conn) {
  return new Promise((resolve, reject) => {

    conn.query(`SELECT * 
      FROM email_tracker 
      WHERE status = "QUEUED" 
      AND attempts < 5 
      AND bounced = 0
      AND email_type != "VERIFY_EMAIL"; `, 
    (error, mail, fields) => {

      if (error) {
        reject(error);
      }

      else {
        resolve(mail)
      }

    })

  })
}

function isInQueue (queue, object) {
  var found = false;
  for(var i = 0; i < queue.length; i++) {
      if (queue[i].id == object.id) {
          found = true;
          break;
      }
  }

  return found;
}

module.exports = Queue;