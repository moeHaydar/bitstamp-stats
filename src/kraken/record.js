'use strict'

const BUY_RECORD = 'BUY';
const SELL_RECORD = 'SELL';

class Record {
  constructor(obj) {
    this.btc = parseFloat(obj.vol);
    this.type = obj.type.toLowerCase() === 'sell' ? SELL_RECORD : BUY_RECORD;
    this.btcPrice = parseFloat(obj.price);
    this.currAmount = parseFloat(obj.cost);
    this.fee = parseFloat(obj.fee);
    this.margin = parseFloat(obj.margin);
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
