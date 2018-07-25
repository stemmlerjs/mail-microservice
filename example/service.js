'use strict'

class Service {
  constructor (intent, ip, port) {
    this._intent = intent;
    this._ip = ip;
    this._port = port;
    this._timestemp = Math.floor(new Date() / 1000);
  }
}

module.exports = Service;