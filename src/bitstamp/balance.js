'use strict'
const _ = require('lodash');
const moment = require('moment');
const { Record } = require('./record');
const { Bitstamp } = require('bitstampjs');

class AmountFee {
  constructor (amount = 0, fee = 0) {
    this.amount = amount;
    this.fee = fee;
  }

  appendAmount(amount) {
    this.amount += amount;
  }

  setAmount(amount) {
    this.amount = amount;
  }
  getAmount() {
    return this.amount;
  }

  appendFee(fee) {
    this.fee += fee;
  }
  setFee(fee) {
    this.fee = fee;
  }
  getFee() {
    return this.fee;
  }
}

class RevenueFee {
  constructor (revenue = 0, fee = 0) {
    this.revenue = revenue;
    this.fee = fee;
  }

  setRevenue(revenue) {
    this.revenue = revenue;
  }
  getRevenue() {
    return this.revenue;
  }

  setFee(fee) {
    this.fee = fee;
  }
  getFee() {
    return this.fee;
  }
}



exports.BitstampBalance = class {
  constructor(currency, btc_currency, printer) {
    this.currency = currency;
    this.btc_currency = btc_currency;
    this.printer = printer;
    this.balance = new Map();
    this.trades = {};
  }

  init(data) {
    _.forEach(data, record => {
      if (record.type != Bitstamp.TRANSACTIONS.TRADE) {
        return printer.info('skipping transaction: ' + r.type.green )
      }

      let datetime = moment(record.datetime);
      let monthMap = this.getMonthMap(datetime.format('YYYYMM'));
      let dayArr = this.getDayArr(monthMap, datetime.format('YYYYMMDD'));

      let newRecord = new Record(_.pick(record, ['btc', this.btc_currency, this.currency, 'fee', 'datetime']), this.currency, this.btc_currency);

      if (newRecord.isBuy()) {
        this.buy(newRecord.getBtcPrice(), newRecord.getBtc(), newRecord.getFee());
      } else {
        let sellData = this.sell(newRecord.getBtcPrice(),  newRecord.getBtc());
        newRecord.setRevenue(sellData.getRevenue());
      }

      dayArr.push(newRecord);
    });

    return this;
  }

  buy(price, amount, fee) {
    let entry = this.balance.get(price);
    if (entry === undefined) {
      this.balance.set(price, new AmountFee(amount, fee));
    } else {
      entry.appendAmount(amount);
      entry.appendFee(fee);
    }
  }

  sell(price, amount) {
    return this.deductWithRevenue(price, amount);
  }

  deductWithRevenue(price, amount) {
    if (amount <= 0.00000001) return new RevenueFee();

    let minPrice = this.getMinPrice();
    let minPriceAmount = this.balance.get(minPrice).getAmount();
    if (minPriceAmount === undefined) {
      this.printer.info((price + '/' + amount + ' has no buy').red);
      return new RevenueFee();
    }

    if (minPriceAmount - amount > 0.00000001) {
      let newAmountLeft = minPriceAmount - amount;

      let entry = this.balance.get(minPrice);
      let feeLeft = entry.getFee() * (newAmountLeft / minPriceAmount);
      let currFee = entry.getFee() - feeLeft;
      entry.setAmount(newAmountLeft);
      entry.setFee(feeLeft);

      return new RevenueFee(amount * (price - minPrice), currFee);

    } else {
      let entry = this.balance.get(minPrice);
      this.balance.set(minPrice, new AmountFee());
      this.balance.delete(minPrice);

      let recCall = this.deductWithRevenue(price, amount - minPriceAmount);
      return new RevenueFee(minPriceAmount * (price - minPrice) + recCall.getRevenue(), entry.getFee() + recCall.getFee());
    }
  }

  getMinPrice() {
    let newMinPrice = Number.MAX_VALUE;
    this.balance.forEach((a, p) => {
      if (newMinPrice > p) {
        newMinPrice = p;
      }
    });

    return newMinPrice;
  }

  printCurrentBalance(prefix = '') {
    this.printer.info();
    this.printer.info(prefix + 'Current coin balance: '.yellow);
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
