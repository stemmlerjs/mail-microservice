
class Mail {
  
  constructor (id, originatorId, destinationEmail, messageTitle, messageBody, emailType, status, attempts, createdAt) {
    this.id = id;
    this.originatorId = originatorId;
    this.destinationEmail = destinationEmail;
    this.messageTitle = messageTitle;
    this.messageBody = messageBody;
    this.emailType = emailType;
    this.status = status;
    this.attempts = attempts;
    this.createdAt = createdAt;
  }

}

module.exports = Mail;