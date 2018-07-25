'use strict';
const axios = require('axios');
const serviceHandler = require('../server/serviceHandler');
const http = require('http');
const server = http.createServer(serviceHandler);
const appURL = process.env.APP_URL || 'http://127.0.0.1:3000';

server.listen(() => {
  console.log(`[Mailer] Listening for requests on port :${server.address().port} in ${serviceHandler.get('env')} mode.`);

  const announceSelf = async () => {
    try {
      await axios.put(`${appURL}/services/mail/${server.address().port}`)
      console.log('[Mailer] Connected to service registry.')
    }
    catch (err) {
      // console.log(err)
      console.log('[Mailer] Could not connect to service registry.')
    }
  }

  announceSelf();
  setInterval(announceSelf, 10 * 1000)
})