'use strict'
const _ = require('lodash');
const moment = require('moment');
const { Record } = require('./record');


exports.KrakenBalance = class {
  constructor(currency, printer) {
    this.currency = currency;
    this.printer = printer;
    this.balance = new Map();
    this.trades = {};
  }

  init(data) {
    _.forEach(data, record => {

      let datetime = moment.unix(record.time);
      let monthMap = this.getMonthMap(datetime.format('YYYYMM'));
      let dayArr = this.getDayArr(monthMap, datetime.format('YYYYMMDD'));
      let newRecord = new Record(record);

      dayArr.push(newRecord);
    });


    return this;
  }

  printCurrentBalance(prefix = '') {
    this.printer.info();
    this.printer.info(prefix + 'Current balance: '.yellow);
    this.printer.info(prefix + '\t' + this.printer.spacedString('price', 18).underline + '  ' + this.printer.spacedString('btc', 18).underline + '  ' + this.printer.spacedString('fee', 18).underline);

    this.balance.forEach( (v, i) => {
      this.printer.info(prefix + '\t' + this.printer.spacedString(i, 20) + this.printer.spacedString(v.getAmount(), 20), + this.printer.spacedString(v.getFee(), 20));
    });
     this.printer.info();
  }

  getTrades() {
    return this.trades;
  }

  getMonthMap(date) {
    if (!this.trades[date]) {
      this.trades[date] = {};
    }

    return this.trades[date];
  }

  getDayArr(map, date) {
    if (!map[date]) {
      map[date] = [];
    }

    return map[date];
  }

}
