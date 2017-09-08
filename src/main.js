const moment = require('moment');
const _ = require('lodash')
const colors = require('colors');
const logger = require('./logger');
const async = require('async');

const { Bitstamp } = require('bitstampjs');
const { Stats } = require('./stats');
const { Balance } = require('./balance');
const { Record } = require('./record');
const Confirm = require('prompt-confirm');

exports.Main = class {
  constructor(config) {
    this.currency = (config.bitstamp.currency === 'eur') ? 'eur' : 'usd';
    this.currencySign = (this.currency === 'eur') ? '€' : '$';

    logger.info('Currency set to: ' + this.currency.green);

    this.btcCurrency = 'btc_' + this.currency;
    this.currencyPair = 'btc' + this.currency;

    this.bitstamp = new Bitstamp(config.bitstamp.API_KEY, config.bitstamp.SECRET,
      config.bitstamp.CUSTOMER_ID, this.currencyPair);
  }


  getOpenOrders(cb) {
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

  buyLimitOrder(amount, price, isMinimal) {
    logger.info('Place buy limit order '.cyan + 'amount='.cyan + (amount + '').green + ' price='.cyan + (price + '').green);

    async.series([
      done => {
       new Confirm('Are you sure?')
        .ask(ok => {
          if (ok) {
            done(null);
          } else {
            done('Cancelled');
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
        logger.info(err.red)
      };
    });

  }

  sellLimitOrder(amount, price, isMinimal) {
    logger.info('Place sell limit order '.cyan + 'amount='.cyan + (amount + '').green + ' price='.cyan + (price + '').green);

    async.series([
      done => {
       new Confirm('Are you sure?')
        .ask(ok => {
          if (ok) {
            done(null);
          } else {
            done('Cancelled');
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

      let trades = new Balance(this.currency, this.btcCurrency, logger).init(rawData).getTrades();

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

        // temp solution for lazy printing
        let toPrint = [];
        let printerQueue = (msg) => {
          toPrint.push(msg);
        }

        _.forEach(monthData, (dayData, day) => {
          printerQueue('\t\t\t' + moment(day, 'YYYYMMDD').format('DD, MMMM YYYY').yellow + ':');
          printerQueue('\t\t\t\tTrades: ' + dayData.length);

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
            statsDayBuying.printTradeStats(printerQueue, 'Buying stats', '\t\t\t\t');
            statsDaySelling.printTradeStats(printerQueue, 'Selling stats', '\t\t\t\t');

            printerQueue();
          }
        });

        Stats.mergeStats(statsAllBuying, statsMonthBuying);
        Stats.mergeStats(statsAllSelling, statsMonthSelling);

        statsMonthBuying.printTradeStats(logger.info, 'Buying stats:', '\t\t');
        statsMonthSelling.printTradeStats(logger.info, 'Selling stats:', '\t\t');

        if (!isMinimal) {
          logger.info('\t\tPer day: ');

          _.forEach(toPrint, msg => {
            logger.info(msg);
          });
        }

        logger.info();
      });

      statsAllBuying.printTradeStats(logger.info, 'All Buying stats'.bold.cyan, "");
      logger.info();
      statsAllSelling.printTradeStats(logger.info, 'All Selling stats'.bold.cyan, "");
    });
  }
  calcTrade(amount, buyPrice, sellPrice) {
    logger.info('calculating profit if buying '.cyan + '%j'.magenta + ' btc @ '.cyan + '%j %s'.magenta + ' and selling @ '.cyan + '%j %s'.magenta + '...'.cyan, amount, buyPrice, this.currencySign, sellPrice, this.currencySign);

    async.series({
      user: done => {
        this.bitstamp.getUserBalance(done);
      }
    }, (err, results) => {
      if (err) {
        return this.bitstamp.printError(err, logger.error);
      }

      let expectedBuyFee = parseFloat(buyPrice) * parseFloat(results.user.fee) / 100;
      let expectedSellFee = parseFloat(sellPrice) * parseFloat(results.user.fee) / 100;

      let expectedProfit = amount * (sellPrice - buyPrice) - expectedBuyFee - expectedSellFee;

      logger.info((' Expected buy fee (' + this.currencySign + '): ').yellow + (expectedBuyFee + '').red);
      logger.info(('Expected sell fee (' + this.currencySign + '): ').yellow + (expectedSellFee + '').red);
      logger.info(('  Expected profit (' + this.currencySign + '): ').yellow + (expectedProfit + '').green);
    });
  }

  calcSellAt(amount, price, isMinimal) {
    logger.info('calculating profit if selling '.cyan + '%j btc'.yellow + ' @ '.cyan + '%j %s'.yellow + '...'.cyan, amount, price, this.currencySign);

    async.series({
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

      let balance = new Balance(this.currency, this.btcCurrency, logger).init(results.transactions);

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

      let trades = new Balance(this.currency, this.btcCurrency, logger).init(rawData).getTrades();

      let statsAllRevenue = new Stats(this.currencySign);

      _.forEach(trades, (monthData, month) => {
        let statsMonthRevenue = new Stats(this.currencySign);
        logger.info('\t' + moment(month, 'YYYYMMDD').format('MMMM YYYY').yellow + ':');


        // temp solution for lazy printing
        let toPrint = [];
        let printerQueue = (msg) => {
          toPrint.push(msg);
        }

        _.forEach(monthData, (dayData, day) => {
          printerQueue('\t\t\t' + moment(day, 'YYYYMMDD').format('DD, MMMM YYYY').yellow + ':');

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
            statsDayRevenue.printRevenueStats(printerQueue, 'Revenue stats', '\t\t\t\t');

            printerQueue();
          }
        });

        Stats.mergeStats(statsAllRevenue, statsMonthRevenue);

        statsMonthRevenue.printRevenueStats(logger.info, 'Revenue stats:', '\t\t');

        if (!isMinimal) {
          logger.info('\t\tPer day: ');

          _.forEach(toPrint, msg => {
            logger.info(msg);
          });
        }

        logger.info();
      });

      statsAllRevenue.printRevenueStats(logger.info, 'All revenue stats'.bold.cyan, "");

    });
  }


}
