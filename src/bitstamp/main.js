const moment = require('moment');
const _ = require('lodash')
const colors = require('colors');
const logger = require('../logger');
const async = require('async');

const { Bitstamp } = require('bitstampjs');
const { Stats } = require('../stats');
const { BitstampBalance } = require('./balance');
const { Record } = require('./record');
const { PrinterQueue } = require('../printer-queue');
const Confirm = require('prompt-confirm');

exports.BitstampMain = class {
  constructor(config) {
    this.currency = (config.bitstamp.currency === 'eur') ? 'eur' : 'usd';
    this.currencySign = (this.currency === 'eur') ? '€' : '$';

    logger.info('Currency set to: ' + this.currency.green);

    this.btcCurrency = 'btc_' + this.currency;
    this.currencyPair = 'btc' + this.currency;

    this.bitstamp = new Bitstamp(config.bitstamp.API_KEY, config.bitstamp.SECRET,
      config.bitstamp.CUSTOMER_ID, this.currencyPair);

    logger.info('Main exhange: ' + 'Bitstamp'.green);
  }

  formatPrice(price) {
    return price + ' ' + this.currencySign;
  }

  getTradeBalance(isMinimal, cb) {
    return logger.info('Only for kraken. use -e kraken'.red);
  }

  getOpenOrders(isMinimal, cb) {
    logger.info('Getting open orders ...'.cyan);

    this.bitstamp.getOpenOrders((err, rawData) => {
      if (err) {
        return (cb) ? cb(err) : this.bitstamp.printError(err, logger.error);
      }

      if (rawData.length === 0) {
        return (cb) ? cb(err) :logger.info('No open orders'.green);
      }

      logger.info('Open orders: '.cyan);
      logger.info(logger.spacedString('type', 20) + logger.spacedString('amount', 20) + logger.spacedString('price', 20) + logger.spacedString('id', 20));
      _.forEach(rawData, order => {
        let isBuy = (order.type == 0);
        if (isBuy) {
          logger.info((logger.spacedString('BUY', 20) + logger.spacedString(order.amount, 20) + logger.spacedString(order.price, 20) + logger.spacedString(order.id, 20)).yellow);
        } else {
          logger.info((logger.spacedString('SELL', 20) + logger.spacedString(order.amount, 20) + logger.spacedString(order.price, 20) + logger.spacedString(order.id, 20)).green);
        }
      });

      if (cb) cb(null);
    });
  }

  cancelOrder(id) {
    logger.info('canceling order %j ...'.cyan, id);

    this.bitstamp.cancelOrder(id, (err, result) => {
      if (err) {
        return this.bitstamp.printError(err, logger.error);
      }

      if (result.error) {
        return logger.info(result.error.red);
      }

      logger.info('order canceled:');

      this.printRequestOrderResponse(result);
      if (id != result.id) {
        logger.info('ID did not match'.red);
      }
    });
  }

  printRequestOrderResponse(order) {
    logger.info(logger.spacedString('type', 20) + logger.spacedString('amount', 20) + logger.spacedString('price', 20) + logger.spacedString('id', 20));
    logger.info((logger.spacedString((order.type == 0) ? 'BUY' : 'SELL', 20) + logger.spacedString(order.amount, 20) + logger.spacedString(order.price, 20) + logger.spacedString(order.id, 20)).green);
  }

  isAmountAll(amount) {
    return (amount + '').toLowerCase() === 'all';
  }

  processAmountCurrency(amount, price, isMinimal, cb) {
    if (this.isAmountAll(amount)) {
      this.bitstamp.getUserBalance((err, data) => {
        if (err) {
          return cb(err);
        }

        let balance = parseFloat(data[this.currency + '_balance']);
        amount =  balance / parseFloat(price);
        if (!isMinimal ) {
          logger.info('Current balance: '.yellow + (balance + ' ' + this.currencySign).green);
        }

        cb(null, amount);
      });
    } else {
      cb(null, parseFloat(amount));
    }
  }

  processAmountCoinBitstamp(amount, cb) {
    if (this.isAmountAll(amount)) {
      this.bitstamp.getUserBalance((err, data) => {
        if (err) {
          return cb(err);
        }

        cb(null, parseFloat(data['btc_balance']));
      });
    } else {
      cb(null, parseFloat(amount));
    }
  }

  processPriceBitsamp(price, isMinimal, cb) {
    if ( ('' + price).toLowerCase() !== 'now') {
      cb(null, parseFloat(price));
    } else {

      async.waterfall([
        next => {
          this.bitstamp.getHourlyTicker(next);
        },
        (rawData, next) => {
          if (!isMinimal) {

            logger.info('In the last hour: '.yellow);
            logger.info('\t' + logger.spacedString('Last BTC price', 40) + '  ' + logger.spacedString(rawData.last, 20));
            logger.info('\t' + logger.spacedString('HIGH price', 40) + '  ' + logger.spacedString(rawData.high, 20));
            logger.info('\t' + logger.spacedString('LOW price', 40) + '  ' + logger.spacedString(rawData.low, 20));
            logger.info('\t' + logger.spacedString('volume weighted average price', 40) + '  ' + logger.spacedString(rawData.vwap, 20));
            logger.info('\t' + logger.spacedString('Volume', 40) + '  ' + logger.spacedString(rawData.volume, 20));
            logger.info('\t' + logger.spacedString('Highest buy order', 40) + '  ' + logger.spacedString(rawData.bid, 20));
            logger.info('\t' + logger.spacedString('Lowest sell order.', 40) + '  ' + logger.spacedString(rawData.ask, 20));
            logger.info('\t' + logger.spacedString('timestamp', 40) + '  ' + logger.spacedString(rawData.timestamp, 20));
            logger.info('\t' + logger.spacedString('First price', 40) + '  ' + logger.spacedString(rawData.open, 20));

            logger.info();
          }

          let priceChosen = rawData.last;
          next(null, priceChosen);
        }
      ], cb);
    }
  }

  buyLimitOrder(amount, price, isMinimal) {
    logger.info('Place buy limit order '.cyan + 'amount='.cyan + (amount + '').green + ' price='.cyan + (price + '').green);

    async.series([
      done => {
        this.processPriceBitsamp(price, isMinimal, (err, priceChosen) => {
          if (err) {
            return done(err);
          }

          price = priceChosen;
          logger.info('Price to buy: '.yellow + (priceChosen + ' ' + this.currencySign).green );
          done(null);
        });
      },

      done => {
        this.processAmountCurrency(amount, price, isMinimal, (err, newAmount) => {
          if (err) {
            return done(err);
          }

          amount = newAmount;

          logger.info('Amount to buy: '.yellow + (amount + ' btc').green);

          done(null)
        });
      },

      done => {
       new Confirm('Are you sure?')
        .ask(ok => {
          if (ok) {
            done(null);
          } else {
            done('Canceled');
          }
        });
      },
      done => {
        this.bitstamp.buyLimitOrder(amount, price, (err, result) => {
          if (err) {
            return this.bitstamp.printError(err, logger.error);
          }

          if (result.status === 'error') {
            logger.info('Failed to place order: '.red)
            return logger.info(result.reason);
          }

          logger.info('order placed:');
          this.printRequestOrderResponse(result);
          done(null);
        });
      },
      done => {
        if (!isMinimal) {
          this.getOpenOrders(done);
        } else {
          done();
        }
      }
      ], (err, result) => {
        if (err) {
          logger.info(err)
        };
      });
  }

  sellLimitOrder(amount, price, isMinimal) {
    logger.info('Place sell limit order '.cyan + 'amount='.cyan + (amount + '').green + ' price='.cyan + (price + '').green);

    async.series([
      done => {
        this.processPriceBitsamp(price, isMinimal, (err, priceChosen) => {
          if (err) {
            return done(err);
          }

          price = priceChosen;
          logger.info('Price to sell: '.yellow + (priceChosen + ' ' + this.currencySign).green );
          done(null);
        });
      },

      done => {
        this.processAmountCoinBitstamp(amount, (err, newAmount) => {
          if (err) {
            return done(err);
          }

          amount = newAmount;

          logger.info('Amount to sell: '.yellow + (amount + ' btc').green);

          done(null);
        });
      },

      done => {
       new Confirm('Are you sure?')
        .ask(ok => {
          if (ok) {
            done(null);
          } else {
            done('Canceled');
          }
        });
      },
      done => {
        this.bitstamp.sellLimitOrder(amount, price, (err, result) => {
          if (err) {
            return this.bitstamp.printError(err, logger.error);
          }

          if (result.status === 'error') {
            logger.info('Failed to place order: '.red)
            return logger.info(result.reason);
          }

          logger.info('order placed:');
          this.printRequestOrderResponse(result);
          done(null, true);
        });
      },
      done => {
        if (!isMinimal) {
          this.getOpenOrders(done);
        } else {
          done();
        }
      }
      ], (err, result) => {
        if (err) {
          logger.info(err.red)
        };
    });
  }

  getTrades(isMinimal) {
    logger.info('Getting trades stats ...'.cyan);

    this.bitstamp.getUserTransactions((err, rawData) => {
      if (err) {
        return this.bitstamp.printError(err, logger.error);
      }

      let trades = new BitstampBalance(this.currency, this.btcCurrency, logger).init(rawData).getTrades();

      logger.info('Transactions: ' + rawData.length);
      let statsAllBuying = new Stats(this.currencySign);
      let statsAllSelling = new Stats(this.currencySign);

      _.forEach(trades, (monthData, month) => {
        let statsMonthBuying = new Stats(this.currencySign);
        let statsMonthSelling = new Stats(this.currencySign);
        logger.info('\t' + moment(month, 'YYYYMMDD').format('MMMM YYYY').yellow + ':');

        let totalMonthTrades = _.reduce(monthData, function(result, value, key) {
          result += value.length;
          return result;
        }, 0);

        logger.info('\t\tTrades: ' + totalMonthTrades);

        let pq = new PrinterQueue();

        _.forEach(monthData, (dayData, day) => {
          pq.newLine('\t\t\t' + moment(day, 'YYYYMMDD').format('DD, MMMM YYYY').yellow + ':');
          pq.newLine('\t\t\t\tTrades: ' + dayData.length);

          let statsDayBuying = new Stats(this.currencySign);
          let statsDaySelling = new Stats(this.currencySign);

          _.forEach(dayData, tradeRecord => {
            let stats = (tradeRecord.isBuy()) ? statsDayBuying : statsDaySelling;
            stats.fees += tradeRecord.getFee();
            stats.vol += tradeRecord.getCurrAmount();
            stats.volBtc += tradeRecord.getBtc();
          });

          Stats.mergeStats(statsMonthBuying, statsDayBuying);
          Stats.mergeStats(statsMonthSelling, statsDaySelling);

          if (!isMinimal) {
            statsDayBuying.printTradeStats(msg=>pq.newLine(msg), 'Buying stats', '\t\t\t\t');
            statsDaySelling.printTradeStats(msg=>pq.newLine(msg), 'Selling stats', '\t\t\t\t');

            pq.newLine();
          }
        });

        Stats.mergeStats(statsAllBuying, statsMonthBuying);
        Stats.mergeStats(statsAllSelling, statsMonthSelling);

        statsMonthBuying.printTradeStats(logger.info, 'Buying stats:', '\t\t');
        statsMonthSelling.printTradeStats(logger.info, 'Selling stats:', '\t\t');

        if (!isMinimal) {
          logger.info('\t\tPer day: ');
          pq.print(logger.info);
        }

        logger.info();
      });

      statsAllBuying.printTradeStats(logger.info, 'All Buying stats'.bold.cyan, "");
      logger.info();
      statsAllSelling.printTradeStats(logger.info, 'All Selling stats'.bold.cyan, "");
    });
  }

  calcTrade(amount, buyPrice, sellPrice, isMinimal) {
    if (amount.toLowerCase() === 'all') {
      return logger.info('option value not supported: '.red + '"-a all"'.green);
    }

    logger.info('calculating profit if buying '.cyan + '%j'.magenta + ' @ '.cyan + '%j'.magenta + ' and selling @ '.cyan + '%j '.magenta + '...'.cyan, amount, buyPrice, sellPrice);

    async.series({
      currentPriceBuy: done => {
        this.processPriceBitsamp(buyPrice, isMinimal, (err, priceChosen) => {
          if (err) {
            return done(err);
          }

          buyPrice = priceChosen;
          logger.info('Price to buy: '.yellow + (priceChosen + ' ' + this.currencySign).green );
          done(null);
        });
      },

      currentPriceSell: done => {
        this.processPriceBitsamp(sellPrice, isMinimal, (err, priceChosen) => {
          if (err) {
            return done(err);
          }

          sellPrice = priceChosen;
          logger.info('Price to sell: '.yellow + (priceChosen + ' ' + this.currencySign).green );
          done(null);
        });
      },

      user: done => {
        this.bitstamp.getUserBalance(done);
      }
    }, (err, results) => {
      if (err) {
        return this.bitstamp.printError(err, logger.error);
      }

      let expectedBuyFee = parseFloat(buyPrice) * parseFloat(results.user.fee) / 100;
      let expectedSellFee = parseFloat(sellPrice) * parseFloat(results.user.fee) / 100;
      let expectedRevenue = amount * (sellPrice - buyPrice);
      let expectedProfit = expectedRevenue - expectedBuyFee - expectedSellFee;

      logger.info((' Expected Revenue (' + this.currencySign + '): ').yellow + (expectedRevenue + '').green);

      logger.info((' Expected buy fee (' + this.currencySign + '): ').yellow + (expectedBuyFee + '').red);
      logger.info(('Expected sell fee (' + this.currencySign + '): ').yellow + (expectedSellFee + '').red);
      logger.info(('  Expected profit (' + this.currencySign + '): ').yellow + (expectedProfit + '').green);
    });
  }

  calcSellAt(amount, price, isMinimal) {
    logger.info('calculating profit if selling '.cyan + '%j'.yellow + ' @ '.cyan + '%j'.yellow + '...'.cyan, amount, price);

    async.series({
      currentPrice: done => {
        this.processPriceBitsamp(price, isMinimal, (err, priceChosen) => {
          if (err) {
            return done(err);
          }

          price = priceChosen;
          logger.info('Price to sell: '.yellow + (priceChosen + ' ' + this.currencySign).green );
          done(null);
        });
      },

      amountCoin: done => {
        this.processAmountCoinBitstamp(amount, (err, newAmount) => {
          if (err) {
            return done(err);
          }

          amount = newAmount;

          logger.info('Amount to sell: '.yellow + (amount + ' btc').green);

          done(null);
        });
      },

      transactions: done => {
        this.bitstamp.getUserTransactions(done);
      },

      user: done => {
        this.bitstamp.getUserBalance(done);
      }
    }, (err, results) => {
      if (err) {
        return this.bitstamp.printError(err, logger.error);
      }

      let balance = new BitstampBalance(this.currency, this.btcCurrency, logger).init(results.transactions);

      if (!isMinimal) {
        balance.printCurrentBalance();
      }

      let sellData = balance.sell(price, amount);
      logger.info(('          Revenue (' + this.currencySign + '): ').yellow + (sellData.getRevenue() + '').green);

      let expectedFee = parseFloat(price) * parseFloat(results.user.fee) / 100;
      let expectedProfit = sellData.getRevenue() - (sellData.getFee() + expectedFee);

      logger.info(('          Buy fee (' + this.currencySign + '): ').yellow + (sellData.getFee() + '').red);

      logger.info(('Expected sell fee (' + this.currencySign + '): ').yellow + (expectedFee + '').red);

      logger.info(('  Expected profit (' + this.currencySign + '): ').yellow + (expectedProfit + '').green);

    });

  }

  getRevenues(isMinimal) {
    logger.info('Getting revenues stats ...'.cyan);

    this.bitstamp.getUserTransactions((err, rawData) => {
      if (err) {
        return this.bitstamp.printError(err, logger.error);
      }

      let trades = new BitstampBalance(this.currency, this.btcCurrency, logger).init(rawData).getTrades();

      let statsAllRevenue = new Stats(this.currencySign);

      _.forEach(trades, (monthData, month) => {
        let statsMonthRevenue = new Stats(this.currencySign);
        logger.info('\t' + moment(month, 'YYYYMMDD').format('MMMM YYYY').yellow + ':');


        let pq = new PrinterQueue();

        _.forEach(monthData, (dayData, day) => {
          pq.newLine('\t\t\t' + moment(day, 'YYYYMMDD').format('DD, MMMM YYYY').yellow + ':');

          let statsDayRevenue = new Stats(this.currencySign);

          _.forEach(dayData, record => {
            statsDayRevenue.appendRevenue(record.getRevenue());
            statsDayRevenue.appendVolBtc(record.getBtc());
            if (record.isSell()) {
              statsDayRevenue.appendVolSold(record.getBtc());
            }
            statsDayRevenue.appendFees(record.getFee());
          });

          Stats.mergeStats(statsMonthRevenue, statsDayRevenue);

          if (!isMinimal) {
            statsDayRevenue.printRevenueStats(msg=>pq.newLine(msg), 'Revenue stats', '\t\t\t\t');

            pq.newLine();
          }
        });

        Stats.mergeStats(statsAllRevenue, statsMonthRevenue);

        statsMonthRevenue.printRevenueStats(logger.info, 'Revenue stats:', '\t\t');

        if (!isMinimal) {
          logger.info('\t\tPer day: ');
          pq.print(logger.info);
        }

        logger.info();
      });

      statsAllRevenue.printRevenueStats(logger.info, 'All revenue stats'.bold.cyan, "");

    });
  }
}
