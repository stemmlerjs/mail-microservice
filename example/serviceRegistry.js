"use strict";

const Service = require('./service');

/**
 * @class ServiceRegistry
 * @desc Keep track of active services. When a request needs
 * to be served for a particular intent, ask the service registry
 * for a handler.
 */

class ServiceRegistry {
  constructor() {
    this._services = [];
    this._serviceTimeout = 30;
  }

  /**
   * add
   * 
   * @desc Add a new service to the service registry.
   * @public
   * 
   * @param {String} service intent type
   * @param {String} remote ip addr of the service
   * @param {Number} remote port the service operates on
   * 
   * @return void
   */

  add(intent, ip, port) {
    const key = `${intent}${ip}${port}`;

    // New service
    if (!this._services[key]) {
      this._services[key] = {};
      this._services[key].timestamp = Math.floor(new Date() / 1000);
      this._services[key].ip = ip;
      this._services[key].port = port;
      this._services[key].intent = intent;

      console.log(`Added service for intent ${intent} on ${ip}:${port}`);
      this._cleanup();
    } else {
      // Update service timestamp
      this._services[key].timestamp = Math.floor(new Date() / 1000);
      console.log(
        `Updated service for intent ${intent} on ${ip}:${port}`
      );
      this._cleanup();
    }
  }

  /**
   * _cleanup
   * 
   * @desc Go through all of the services and remove the
   * ones that have expired.
   * 
   * @private
   * @return void
   */

  _cleanup() {
    const now = Math.floor(new Date() / 1000);

    for (let key in this._services) {
      if (this._services[key].timestamp + this._timeout < now) {
        console.log(
          `Removed service for intent ${this._services[key].intent}`
        );
        delete this._services[key];
      }
    }
  }

  /**
   * remove
   * 
   * @desc Remove a particular service instance.
   * @public
   * 
   * @param {String} intent
   * @param {String} remote ip addr
   * @param {Number} remote port no
   */

  remove(intent, ip, port) {
    const key = intent + ip + port;
    delete this._services[key];
  }

  /**
   * get
   * 
   * @desc Get a service from the registry to handle the intent
   * @public
   * 
   * @param {String} intent
   * @return {Object}
   */

  get (intent) {
    this._cleanup();
    // Instead of this, do a round-robin approach so that we don't
    // call on the same handler every dang time.
    for (let key in this._services) {
      if (this._services[key].intent == intent) return this._services[key];
    }
    return null;
  }
}


module.exports = ServiceRegistry;