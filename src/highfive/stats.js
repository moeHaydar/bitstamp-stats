'use strict';
const _ = require('lodash')
const colors = require('colors');
const logger = require('../logger');
const async = require('async');

exports.HighFiveStats = class {
  constructor() {
    this.currency = 'eur';
    this.currencySign = (this.currency === 'eur') ? '€' : '$';
  }

  formatPrice(price) {
    return parseFloat(price).toFixed(4) + ' ' + this.currencySign;
  }

  formatAmount(amount) {
    return parseFloat(amount).toFixed(4) + '';
  }

  formatPercent(amount) {
    return amount * 100 + '%';
  }

  calcProfit() {
    let clientProfitPercent = 0.5;

    let fundStartEquity = 90000;
    let clientEquity = 50000;

    let fundCurrentEquity = 120000;

    let profit = fundCurrentEquity - fundStartEquity;

    let clientShare = clientEquity/fundStartEquity;
    let clientShareProfit = clientShare *  profit;
    let clientTakeAway = clientShareProfit * clientProfitPercent;
    let firmTakeAway = clientShareProfit * (1-clientProfitPercent);

    let firmFullProfit = profit - clientTakeAway;

    logger.info(logger.printSE('Fund\'s initial equity ', this.formatAmount(fundStartEquity).green));
    logger.info(logger.printSE('Client\'s equity ', this.formatAmount(clientEquity).green));

    logger.info(logger.printSE('Client\'s share ', this.formatPercent(clientShare).green));


    logger.info(logger.printSE('Current fund\'s equity ', this.formatAmount(currentEquity).green));
    logger.info();


    logger.info(logger.printSE('Profit', this.formatAmount(profit).green));

    logger.info(logger.printSE('Firm full Profit', this.formatAmount(firmFullProfit).green));

    logger.info(logger.printSE('Firm profit from client', this.formatAmount(firmTakeAway).green));

    logger.info(logger.printSE('Client\'s profit ', this.formatPrice(clientTakeAway).green));


  }
}
