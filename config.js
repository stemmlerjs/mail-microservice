
const yml        = require('config-yml')
const mysql      = require('mysql');

let dbConnection = mysql.createConnection({
  host     : process.env.DB_URL,
  user     : process.env.DB_USER,
  password : process.env.DB_PASS,
  database : process.env.DB_NAME,
  multipleStatements: true
});

dbConnection.connect();

module.exports = {
  db: {
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    pass: process.env.DB_PASS,
    host: process.env.MARIA_URL,
    port: 3306,
    getConnection: () => {
      return dbConnection;
    }
  },
  mail: {
    transportString: process.env.UNIVJOBS_TRANSPORT_SMTP,
    rate: yml.mail_rate
  },
  maintainers: ['metroidman12@gmail.com', 'charlesjavelona@gmail.com'],
  slack: {
    webhook_url: 'https://hooks.slack.com/services/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',
    payload: {
      "channel":"#mailer", 
      "text": "This is a line of text in a channel.\nAnd this is another line of text."
    }
  },
  application: yml.application,
  reporter: yml.reporter
}
