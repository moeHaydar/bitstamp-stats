'use strict';

const moment = require('moment');
const _ = require('lodash')
const colors = require('colors');
const logger = require('../logger');
const async = require('async');

const KrakenClient = require('kraken-api');
const { Stats } = require('../stats');
const { KrakenBalance } = require('./balance');
const { Record } = require('./record');
const { PrinterQueue } = require('../printer-queue');
const Confirm = require('prompt-confirm');

exports.KrakenMain = class {
  constructor(config) {
    this.currency = (config.bitstamp.currency === 'eur') ? 'eur' : 'usd';
    this.currencySign = (this.currency === 'eur') ? '€' : '$';

    logger.info('Currency set to: ' + this.currency.green);

    this.kraken = new KrakenClient(config.kraken.KEY, config.kraken.SECRET);

    logger.info('Main exhange: ' + 'Kraken'.green);
  }

  formatPrice(price) {
    return parseFloat(price).toFixed(4) + ' ' + this.currencySign;
  }

  formatAmount(amount) {
    return parseFloat(amount).toFixed(4);
  }

  getTradeBalance(isMinimal, cb) {
    let printBalance = (line, desc = '') => {
      let str = '\t' +line;

      if (!isMinimal && desc) {
        str += '\t' + desc.grey;
      }

      logger.info(str);
    }

    logger.info('Getting trade balance ...'.cyan);

     async.series({
      balance: done => this.kraken.api('Balance', {}, done),
      tradeBalance: done => this.kraken.api('TradeBalance', {}, done)
     }, (err, results) => {
      if (err) {
        return (cb) ? cb(err) : logger.error(err)
      }

      let tradeBalance = results.tradeBalance.result;

      logger.info('Trade Balances: '.yellow);

      printBalance(logger.printSE('Equity ', this.formatPrice(tradeBalance.e).green), 'Trade balance combined with unrealized profit/loss.'.grey);

      printBalance(logger.printSE('Trade Balance ', this.formatPrice(tradeBalance.tb).green), 'Total margin currency balance.'.grey);

      printBalance(logger.printSE('Profit/Loss', this.formatPrice(tradeBalance.n).green), 'Unrealized net profit/loss of open positions.'.grey);

      printBalance(logger.printSE('Free Margin ', this.formatPrice(tradeBalance.mf).green), 'Usable margin balance. Equal to equity minus used margin.'.grey);

      printBalance(logger.printSE('Margin Level ', (tradeBalance.e + '%').green), 'Percentage ratio of equity to used margin.'.grey);

      printBalance(logger.printSE('Cost OP', this.formatPrice(tradeBalance.c).green), 'Cost basis of open positions'.grey);

      printBalance(logger.printSE('Current floating valuation ', this.formatPrice(tradeBalance.v).green), 'Current floating valuation of open positions'.grey);

      logger.info();
      logger.info('Balance distribution:'.yellow);
      let balance = results.balance.result;


      _.forEach(balance, (v, k) => {
        let amount = (k.indexOf('EUR') > -1) ? this.formatPrice(v) : this.formatAmount(v);

        printBalance(logger.printSE(k + ' ', amount.green));
      });


      let currentXBT = parseFloat(balance.XXBT);
      this.getTradesForNeededXBT([], currentXBT, (err, trades) => {
        if (err) {
          logger.error(err);
          return;
        }

        let balance = new KrakenBalance(this.currency, this.currencySign, logger).init(trades, currentXBT);

        logger.info();
        logger.info('XBT cost:'.yellow);

        balance.printCurrentBalance('\t');

      });

      if (cb) return cb(true);
    });
  }

  getOpenOrders(isMinimal, cb) {
    this.kraken.api('OpenOrders', {}, (err, response) => {
        if (err) {
          return (cb) ? cb(err) : logger.error(err)
        }
        let rawData = response.result;

        if (rawData.open.length === 0) {
          return (cb) ? cb(err) :logger.info('No open orders'.green);
        }

        logger.info('Open orders: '.cyan);

        if (isMinimal) {
          let cols = '';
          cols += logger.spacedString('id', 22);
          cols += logger.spacedString('order', 22);
          logger.info(cols);

           _.forEach(rawData.open, (order, id) => {
            let orderDesc = '';
            orderDesc += logger.spacedString(id, 22);
            orderDesc += order.descr.order;

            if (order.descr.type === 'sell') {
              logger.info(orderDesc.yellow);
              logger.info('\t\t\t' + logger.printAny(order.descr.close).yellow);
            } else {
              logger.info(orderDesc.green);
              logger.info('\t\t\t' + logger.printAny(order.descr.close).green);
            }
          });

        } else {
          let cols = '';
          cols += logger.spacedString('id', 22);
          cols += logger.spacedString('status', 10);
          cols += logger.spacedString('type', 12);
          cols += logger.spacedString('pair', 8);
          cols += logger.spacedString('price', 15);
          cols += logger.spacedString('leverage', 10);
          cols += logger.spacedString('vol', 12);
          cols += logger.spacedString('vol exec', 12);
          cols += logger.spacedString('close', 15);

          logger.info(cols);

          _.forEach(rawData.open, (order, id) => {
            let orderDesc = '';
            orderDesc += logger.spacedString(id, 22);
            orderDesc += logger.spacedString(order.status, 10)
            orderDesc += logger.spacedString(order.descr.type + '(' + order.descr.ordertype +')', 12)
            orderDesc += logger.spacedString(order.descr.pair, 8)
            orderDesc += logger.spacedString(order.descr.price + '/' + order.descr.price2, 15)
            orderDesc += logger.spacedString(order.descr.leverage, 10)
            orderDesc += logger.spacedString(order.vol, 12);
            orderDesc += logger.spacedString(order.vol_exec, 12);
            orderDesc += logger.spacedString(logger.printAny(order.descr.close), 15);


            if (order.descr.type === 'sell') {
              logger.info(orderDesc.yellow);
            } else {
              logger.info(orderDesc.green);
            }
          });
        }


        if (cb) cb(null);
      });
  }

  getCurrentPrice(isMinimal) {
    // for now just show XBT EUR
    this.kraken.api('Ticker', {pair: 'XBTEUR'}, (err, rawData) => {
      if (err) {
        logger.error(err);
      }

      let xbt = rawData.result.XXBTZEUR;

      logger.info('\t' + logger.spacedString('ASK price', 40) + '  ' + logger.spacedString(xbt.a[0], 20));
      logger.info('\t' + logger.spacedString('BID price', 40) + '  ' + logger.spacedString(xbt.b[0], 20));
      logger.info('\t' + logger.spacedString('LAST TRADE price', 40) + '  ' + logger.spacedString(xbt.c[0], 20));
      logger.info('\t' + logger.spacedString('HIGH price', 40) + '  ' + logger.spacedString(xbt.h[0], 20));
      logger.info('\t' + logger.spacedString('LOW price', 40) + '  ' + logger.spacedString(xbt.l[0], 20));
      logger.info('\t' + logger.spacedString('OPENING price', 40) + '  ' + logger.spacedString(xbt.o, 20));
    })
  }

  getTradesForNeededXBT(data, xbtNeeded, cb) {
    this.kraken.api('TradesHistory', {ofs: data.length, type: 'no position'}, (err, rawData) => {
      if (err) {
        return cb(err);
      }
      let trades = rawData.result.trades;
      let count = rawData.result.count;

      let newData = _.concat(data, _.filter(trades, (o) => {
        return o.pair === 'XXBTZEUR' && o.type === 'buy';
      }));

      let xbtCollected = _.sumBy(newData, (o) => parseFloat(o.vol));

      if (xbtCollected < xbtNeeded) {
        this.getTradesForNeededXBT(newData, xbtNeeded, cb);
      } else {
        cb(null, newData);
      }
    });
  }

  getTrades(isMinimal) {
    logger.info('Getting trades stats ...'.cyan);

    // todo
  }

  getRevenues(isMinimal) {
    logger.info('Getting revenues stats ...'.cyan);


    this.kraken.api('Spread', {pair: 'BCHEUR'}, (err, response) => {
      if (err) {
        logger.error(err);
        return;
      }

      logger.info(response)
    });
    return

    this.kraken.api('TradesHistory', {}, (err, response) => {
      if (err) {
        return this.bitstamp.printError(err, logger.error);
      }

      let rawData = response.result;

      let trades = new KrakenBalance(this.currency, logger).init(_.flatMap(rawData.trades)).getTrades();

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

  cancelOrder(id) {
    logger.info('canceling order %j ...'.cyan, id);

  }

  isAmountAll(amount) {
    return (amount + '').toLowerCase() === 'all';
  }

  processAmountCurrency(amount, price, isMinimal, cb) {

  }

  processAmountCoin(amount, cb) {

  }

  processPrice(price, isMinimal, cb) {

  }

  buyLimitOrder(amount, price, isMinimal) {
    logger.info('Place buy limit order '.cyan + 'amount='.cyan + (amount + '').green + ' price='.cyan + (price + '').green);

    async.series([
      done => {
        this.processPrice(price, isMinimal, (err, priceChosen) => {
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
        // TODO
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
        this.processPrice(price, isMinimal, (err, priceChosen) => {
          if (err) {
            return done(err);
          }

          price = priceChosen;
          logger.info('Price to sell: '.yellow + (priceChosen + ' ' + this.currencySign).green );
          done(null);
        });
      },

      done => {
        this.processAmountCoin(amount, (err, newAmount) => {
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
        // TODO
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

  calcTrade(amount, buyPrice, sellPrice, isMinimal) {
    if (amount.toLowerCase() === 'all') {
      return logger.info('option value not supported: '.red + '"-a all"'.green);
    }

    logger.info('calculating profit if buying '.cyan + '%j'.magenta + ' @ '.cyan + '%j'.magenta + ' and selling @ '.cyan + '%j '.magenta + '...'.cyan, amount, buyPrice, sellPrice);

    async.series({
      currentPriceBuy: done => {
        this.processPrice(buyPrice, isMinimal, (err, priceChosen) => {
          if (err) {
            return done(err);
          }

          buyPrice = priceChosen;
          logger.info('Price to buy: '.yellow + (priceChosen + ' ' + this.currencySign).green );
          done(null);
        });
      },

      currentPriceSell: done => {
        this.processPrice(sellPrice, isMinimal, (err, priceChosen) => {
          if (err) {
            return done(err);
          }

          sellPrice = priceChosen;
          logger.info('Price to sell: '.yellow + (priceChosen + ' ' + this.currencySign).green );
          done(null);
        });
      },

      user: done => {
        // TODO
      }
    }, (err, results) => {
      if (err) {
        return this.bitstamp.printError(err, logger.error);
      }
      // TODO EDIT
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
        this.processPrice(price, isMinimal, (err, priceChosen) => {
          if (err) {
            return done(err);
          }

          price = priceChosen;
          logger.info('Price to sell: '.yellow + (priceChosen + ' ' + this.currencySign).green );
          done(null);
        });
      },

      amountCoin: done => {
        this.processAmountCoin(amount, (err, newAmount) => {
          if (err) {
            return done(err);
          }

          amount = newAmount;

          logger.info('Amount to sell: '.yellow + (amount + ' btc').green);

          done(null);
        });
      },

      transactions: done => {
        // TODO
      },

      user: done => {
        // TODO
      }
    }, (err, results) => {
      if (err) {
        return this.bitstamp.printError(err, logger.error);
      }

      let balance = new KrakenBalance(this.currency, this.btcCurrency, logger).init(results.transactions);

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


}
