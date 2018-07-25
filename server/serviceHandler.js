'use strict'
const Mailer = require('./mailer')
const mailer = new Mailer();
const express = require('express')
const serviceHandler = express();
const bodyParser = require('body-parser');
serviceHandler.use(bodyParser.json());

/**
 * Make the API call that makes us to an action when we get a call
 */

serviceHandler.post('/service', (req, res) => {
  let email = req.body.email;
  let body = req.body.body;
  let title = req.body.title;

  return mailer.send(email, title, body)
    .then(() => res.status(201).json({ message: 'Successfully sent email' }))
    .catch((err) => res.status(500).json({ error: err.toString() }))
})

module.exports = serviceHandler;