'use strict'

const BUY_RECORD = 'BUY';
const SELL_RECORD = 'SELL';

class Record {
  constructor(obj, currency, btc_currency) {
    this.btc = parseFloat(obj.btc);
    this.type = this.btc < 0 ? SELL_RECORD : BUY_RECORD;
    this.btc = Math.abs(this.btc);
    this.btcPrice = obj[btc_currency];
    this.currAmount = Math.abs(parseFloat(obj[currency]));
    this.fee = Math.abs(parseFloat(obj.fee));

    this.revenue = 0;
  }

  setRevenue(rev) {
    this.revenue = rev;
  }
  getFee() {
    return this.fee;
  }
  getBtcPrice() {
    return this.btcPrice;
  }

  getCurrAmount() {
    return this.currAmount;
  }

  getBtc() {
    return this.btc;
  }

  getRevenue() {
    return this.revenue;
  }

  isBuy() {
    return this.type === BUY_RECORD;
  }

  isSell() {
    return this.type === SELL_RECORD;
  }
}


exports.Record = Record;
