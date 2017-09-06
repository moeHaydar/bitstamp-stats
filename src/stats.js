'use strict'

const n = require('numeral');

exports.Stats = class {
   constructor(currencySign = '€') {
    this.revenue = 0;
    this.fees = 0;
    this.vol = 0;
    this.volBtc = 0;
    this.volSold = 0;
    this.currencySign = currencySign;
  }

  appendRevenue(revenue) {
    this.revenue += revenue;
  }

  appendFees(fees) {
    this.fees += fees;
  }

  appendVol(vol) {
    this.vol += vol;
  }

  appendVolBtc(volBtc) {
    this.volBtc += volBtc;
  }

  appendVolSold(volSold) {
    this.volSold += volSold;
  }

  static mergeStats(dest, source) {
    dest.revenue += source.revenue;
    dest.fees += source.fees;
    dest.vol += source.vol;
    dest.volBtc += source.volBtc;
    dest.volSold += source.volSold;
  }

  printTradeStats(printter, label = 'stats', prefix = '') {
    printter(prefix + label);
    printter(prefix + '\t Fees (' + this.currencySign + ') = ' + n(this.fees).format('0,0[.]0').red);
    printter(prefix + '\t  Vol (' + this.currencySign + ') = ' + n(this.vol).format('0,0[.]0'));
    printter(prefix + '\tVol (Btc) = ' + n(this.volBtc).format('0,0[.]000000'));
  }

  printRevenueStats(printer, label = 'Revenue stats', prefix = '') {
    printer(prefix + label);
    printer(prefix + '\tRevenue (' + this.currencySign + ') = ' + n(this.revenue).format('0,0[.]0').green);
    printer(prefix + '\t   Fees (' + this.currencySign + ') = ' + n(this.fees).format('0,0[.]0').red);
    printer(prefix + '\t   BTC sold = ' + n(this.volSold).format('0,0[.]000000'));
  }
}
