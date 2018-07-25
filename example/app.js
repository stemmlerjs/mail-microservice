'use strict';

const express = require('express')
const app = express();
const bodyParser = require('body-parser')
const ServiceRegistry = require('./serviceRegistry')
const serviceRegistry = new ServiceRegistry();
const axios = require('axios')

app.listen(3000, () => {
  console.log('[App] Service registry listening for services.')
})
app.use(bodyParser.json());

app.set('serviceRegistry', serviceRegistry);

// Listen for new services to come alive, then place them in the registry.
app.put('/services/:serviceIntent/:port', (req, res) => {
  const port = req.params.port;
  const serviceIntent = req.params.serviceIntent;
  const ip = req.connection.remoteAddress.includes('::')
    ? `[${req.connection.remoteAddress}]` : req.connection.remoteAddress;

  app.get('serviceRegistry')
    .add(serviceIntent, ip, port);

  return res.status(201).json({ 
    message: `Added ${serviceIntent} to ${serviceIntent} list @ ${ip}:${port}!` 
  })
})

// Example API route for if someone needs to complete their account and we need
// to send them a verification email.

app.post('/register', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  // Salt password
  // Create new user 
  // Save to db
  // Creat auth token to send to user
  // Send verification email
  // ...

  let serviceRegistry = app.get('serviceRegistry');
  let mailService = serviceRegistry.get('mail');

  if (!mailService) {
    console.log('No service available')
  }
  else {
    let verificationToken = "aWYgeW91IGFjdHVhbGx5IGRlY29kZWQgdGhpcywgd293"
    axios({
      method: 'POST',
      url: `http://${mailService.ip}:${mailService.port}/service`,
      data: {
        body: `<p>Click <a href="https://example.com/email/verify/${verificationToken}">here</a> to verify your account</p>`,
        email: email,
        title: 'Verification Email'
      }
    })
    .then(() => console.log('Sent!'))
    .catch((err) => console.log(err))
  }

  return res.status(201).json({ message: 'Account successfully created', token: 'example-token-blah :)' })
})