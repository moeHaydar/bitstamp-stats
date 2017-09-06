'use strict';
const colors = require('colors');
const logger = require('./src/logger');
const args = require('commander');
const config = require('./config.js');
const { Main } = require('./src/main');

// set options
args
  .version('0.0.1')
  .option('-o, --orders', 'list all open orders')
  .option('-c, --cancel <id>', 'cancel order <id>', parseInt)
  .option('-b, --buy <btc-amount>', 'place a buy limit order <btc amount> at set price, use with -p <price>', parseFloat)
  .option('-s, --sell <btc-amount>', 'place a sell limit order at set price, use with -p <price>', parseFloat)
  .option('-t, --trades', 'trades')
  .option('-r, --revenue', 'revenue')
  .option('-x, --calc_sel <btc-amount>', 'Calculate profit when selling <amount> at set price, use with -p <price>', parseFloat)
  .option('-z, --calc_sel_buy <order>', 'Calculate profit with trade', val => val.split(':'))
  .option('-p, --price <price>', 'sets price of request', parseFloat)
  .option('-m, --minimal', 'display minimal details');


args.parse(process.argv);

let main = new Main(config);

let requiredField = (field, erroMsg) => {
  if (!args[field]) {
    logger.info(erroMsg.red);

    process.exit();
  }
}

if (args.calc_sel_buy) {
  if (args.calc_sel_buy.length != 3) {
    logger.info('use this syntax: -z amount:buyPrice:sellPrice'.red);

    process.exit();
  }
  main.calcTrade(parseFloat(args.calc_sel_buy[0]), parseFloat(args.calc_sel_buy[1]), parseFloat(args.calc_sel_buy[2]));
} else if (args.cancel) {
  main.cancelOrder(args.cancel);
} else if (args.orders) {
  main.getOpenOrders();
} else if (args.trades) {
  main.getTrades(args.minimal);
} else if (args.revenue) {
  main.getRevenues(args.minimal);
} else if (args.calc_sel) {
  requiredField('price', 'Price option needed: -p <price>');

  main.calcSellAt(args.calc_sel, args.price, args.minimal);
} else if (args.buy) {
  requiredField('price', 'Price option needed: -p <price>');

  main.buyLimitOrder(args.buy, args.price, args.minimal);
} else if (args.sell) {
  requiredField('price', 'Price option needed: -p <price>');

  main.sellLimitOrder(args.sell, args.price, args.minimal);
} else {
  logger.info('Please choose one at least one of the options'.red);
  args.outputHelp();
}
