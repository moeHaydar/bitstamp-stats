'use strict'
const _ = require('lodash');
const moment = require('moment');
const { Record } = require('./record');


exports.KrakenBalance = class {
  constructor(currency, currencySign, printer) {
    this.currency = currency;
    this.currencySign = currencySign;
    this.printer = printer;
    this.balanceMap = new Map();
    this.ongoingBalance = 0;
    this.currentBalance = 0;
    this.trades = {};
  }


  init(trades, currentBalance) {
    this.currentBalance = currentBalance;
    this.ongoingBalance = 0;

    _.forEach(trades, record => {
      let datetime = moment.unix(record.time);
      let monthMap = this.getMonthMap(datetime.format('YYYYMM'));
      let dayArr = this.getDayArr(monthMap, datetime.format('YYYYMMDD'));
      let newRecord = new Record(record);
      this.addToBalance(newRecord);
      dayArr.push(newRecord);
    });


    return this;
  }

  addToBalance(record) {
    let currentVol = record.getVol();
    let volNeeded = this.currentBalance - this.ongoingBalance;
    let percNeeded = (currentVol < volNeeded) ? 1 : volNeeded / currentVol;

    let newVol = currentVol * percNeeded;
    let newFee = record.getFee() * percNeeded;
    let newCost = record.getCost() * percNeeded;

    let newEntry;
    let currentEntry = this.balanceMap.get(record.getPrice());
    
    if (currentEntry) {
       newEntry = new Record({
        vol: currentEntry.getVol() + newVol,
        fee: currentEntry.getFee() + newFee,
        cost: currentEntry.getCost() + newCost,
        price: currentEntry.getPrice(),
        type: currentEntry.getType()
      });
    } else {
      newEntry = new Record({
        vol: newVol,
        fee: newFee,
        cost: newCost,
        price: record.getPrice(),
        type: record.getType()
      });
    }
    

    this.balanceMap.set(record.getPrice(), newEntry);
    this.ongoingBalance += newVol;
  }

  printCurrentBalance(prefix = '') {
    let mapValues = Array.from(this.balanceMap.values());

    let vol = _.sumBy(mapValues, r => r.getVol());
    let cost = _.sumBy(mapValues, r => r.getCost());
    let fee = _.sumBy(mapValues, r => r.getFee());

    this.printer.info(prefix + this.printer.printSE('Vol ', this.formatAmount(vol).green));
    this.printer.info(prefix + this.printer.printSE('Cost ', this.formatPrice(cost).green));
    this.printer.info(prefix + this.printer.printSE('Fee ', this.formatPrice(fee).green));

    this.printer.info();

    this.printer.info(prefix + this.printer.spacedString('price', 18).underline + '  ' + this.printer.spacedString('btc', 18).underline + '  ' + this.printer.spacedString('fee', 18).underline);

    this.balanceMap.forEach((t, i)  => {
      this.printer.info(prefix + this.printer.spacedString(this.formatPrice(i), 20) + this.printer.spacedString(this.formatAmount(t.getVol()), 20), + this.printer.spacedString(t.getFee(), 20));
    });
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

  formatPrice(price) {
    return parseFloat(price).toFixed(4) + ' ' + this.currencySign;
  }

  formatAmount(amount) {
    return parseFloat(amount).toFixed(4);
  }

}
