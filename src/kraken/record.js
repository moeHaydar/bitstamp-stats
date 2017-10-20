'use strict'

const BUY_RECORD = 'BUY';
const SELL_RECORD = 'SELL';

class Record {
  constructor(obj) {
    this.vol = parseFloat(obj.vol);
    this.type = obj.type.toLowerCase() === 'sell' ? SELL_RECORD : BUY_RECORD;
    this.price = parseFloat(obj.price);
    this.cost = parseFloat(obj.cost);
    this.fee = parseFloat(obj.fee);
  }

  getFee() {
    return this.fee;
  }

  getPrice() {
    return this.price;
  }

  getCost() {
    return this.cost;
  }

  getVol() {
    return this.vol;
  }
  getType() {
    return this.type;
  }
  
  isBuy() {
    return this.type === BUY_RECORD;
  }

  isSell() {
    return this.type === SELL_RECORD;
  }
}


exports.Record = Record;
