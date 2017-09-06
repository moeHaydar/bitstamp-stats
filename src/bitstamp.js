'use strict'
const axios = require("axios");
const crypto = require('crypto');
const qs = require('qs');
const _ = require('lodash');
class Bitstamp {
   constructor(apiKey, secret, customerId, currency){
    this.apiKey = apiKey;
    this.secret = secret;
    this.customerId = customerId;
    this.currencyPair = 'btc' + currency;

    this.api = axios.create({
      baseURL: 'https://www.bitstamp.net/api/v2/',
      headers: {'Content-Type': 'application/x-www-form-urlencoded'}
    });
   }

   generateSignature(nonce) {
    const hash = crypto.createHmac('sha256', this.secret)
      .update(nonce + this.customerId + this.apiKey)
      .digest('hex');

    return hash.toUpperCase();
   }
   getNonce() {
    var now = new Date;

    return Date.UTC(now.getUTCFullYear(),now.getUTCMonth(), now.getUTCDate() ,
      now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
   }

   getUserTransactions( cb, aggregated = []) {
    const LIMIT = 1000;
    let nonce = this.getNonce();
    let params = {
      key: this.apiKey,
      signature: this.generateSignature(nonce),
      nonce: nonce,
      limit: LIMIT,
      offset: aggregated.length,
      sort: 'asc'
    };
    this.api.post('user_transactions/' + this.currencyPair + '/', qs.stringify(params))
    .then(response => {
      aggregated = _.concat(aggregated, response.data);
      if (response.data.length === LIMIT) {
        this.getUserTransactions(cb, aggregated);
      } else {
        cb(null, aggregated)
      }
    })
    .catch(cb);
  }

  getUserBalance(cb) {
    let nonce = new Date().getTime();
    let params = {
      key: this.apiKey,
      signature: this.generateSignature(nonce),
      nonce: nonce
    };
    this.api.post('balance/' + this.currencyPair + '/', qs.stringify(params))
    .then(response => {
      cb(null, response.data)
    })
    .catch(cb);
  }

  getOpenOrders(cb) {
    let nonce = new Date().getTime();
    let params = {
      key: this.apiKey,
      signature: this.generateSignature(nonce),
      nonce: nonce,
    };
    this.api.post('open_orders/' + this.currencyPair + '/', qs.stringify(params))
    .then(response => {
      cb(null, response.data)
    })
    .catch(cb);
  }

  cancelOrder(id, cb) {
    let nonce = new Date().getTime();
    let params = {
      key: this.apiKey,
      signature: this.generateSignature(nonce),
      nonce: nonce,
      id: id
    };
    this.api.post('cancel_order/', qs.stringify(params))
    .then(response => {
      cb(null, response.data)
    })
    .catch(cb);
  }

  buyLimitOrder(amount, price, cb) {
    let nonce = new Date().getTime();
    let params = {
      key: this.apiKey,
      signature: this.generateSignature(nonce),
      nonce: nonce,
      amount: amount,
      price: price
    };
    this.api.post('buy/' + this.currencyPair + '/', qs.stringify(params))
    .then(response => {
      cb(null, response.data)
    })
    .catch(cb);
  }

  sellLimitOrder(amount, price, cb) {
    let nonce = new Date().getTime();
    let params = {
      key: this.apiKey,
      signature: this.generateSignature(nonce),
      nonce: nonce,
      amount: amount,
      price: price
    };
    this.api.post('sell/' + this.currencyPair + '/', qs.stringify(params))
    .then(response => {
      cb(null, response.data)
    })
    .catch(cb);
  }

  printError(error, printer) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      printer(error.response.data);
      printer(error.response.status);
      printer(error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      printer(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      printer(error.message);
    }
    printer(error.config);
  }
};

Bitstamp.TRANSACTIONS = {
  DEPOSIT: 0,
  WITHDRAWAL: 1,
  TRADE: 2,
  TRANSFER: 14,
  print: n => {
    switch(parseInt(n)) {
      case 0: return 'DEPOSIT';
      case 1: return 'WITHDRAWAL';
      case 2: return 'TRADE';
      case 14: return 'SUB ACCOUNT TRANSFER';
    }
  }
}
exports.Bitstamp = Bitstamp;
