'use strict';
const colors = require('colors');
const logger = require('./src/logger');
const args = require('commander');
const config = require('./config.js');
const { Main } = require('./src/main');

// set options
args
  .version('0.0.1')
  .option('-d, --do <action>', 'action to perform')
  .option('-i, --id <id>', 'sets id of request', parseInt)

  .option('-p, --price <price>', 'sets price of request', parseFloat)
  .option('-b, --buy_price <price>', 'sets buy price of request', parseFloat)
  .option('-s, --sell_price <price>', 'sets sell price of request', parseFloat)
  .option('-a, --amount <amount>', 'sets amount of request', parseFloat)
  .option('-m, --minimal', 'display minimal details');


args.on('--help', function(){
  let actionsPrefix = '    ';
  
  let optionFormated = (option) => logger.spacedString(option.green, 69);
  let printOption = (option, desc) => console.log(actionsPrefix + optionFormated(option) + desc);

  console.log('');
  console.log('  Supported actions:');
  console.log('');

  printOption('o, orders', 'list all open orders');
  printOption('c, cancel -id <id>', 'cancel order <id>');
  printOption('t, trades', 'lists all traders stats' + ' use -m to list minial stats'.grey);
  printOption('r, revenue', 'lists revenue stats' + ' use -m to list minial stats'.grey);

  printOption('b, buy -a <amount> -p <price>', 'Sets a buy limit order' + ' use -m to show minial info'.grey);
  printOption('s, sell -a <amount> -p <price>', 'Sets a sell limit order' + ' use -m to show minial info'.grey);
  printOption('sim, simulate -a <amount> -b* <buy_price> -s <sell_price>', 'Simulate a trade. -b is optional: If not set, then uses your available balance.' + ' use -m to show minial info'.grey);


  printOption('sn, sellnow -a <amount>', 'Sells amount using limit order with current market price' + ' use -m to show minial info'.grey);
  console.log('');
});

args.parse(process.argv);

let main = new Main(config);

let requiredField = (field, erroMsg, exitOnFail=true) => {
  if (!args[field]) {
    logger.info(erroMsg.red);

    if (exitOnFail) {
      process.exit();
    } else {
      return false;
    }
  }
  return true;
}

let requiredFields = (...r) => {
  if (!r.every(x=>x === true)) {
     process.exit();
  };
}


if (args.do) {
  switch(args.do) {
    case 'trades':
    case 't':
      main.getTrades(args.minimal);
      break;

    case 'revenue':
    case 'r':
      main.getRevenues(args.minimal);
      break;

    case 'orders':
    case 'o':
      main.getOpenOrders();
      break;

    case 'simulate':
    case 'sim':
      requiredFields(
        requiredField('sell_price', 'Price option needed: use with -s <sell_price>', false), 
        requiredField('amount', 'Amount option needed: use with -a <amount>', false)
      );

      if (args.buy_price) {
        main.calcTrade(args.amount, args.buy_price, args.sell_price);
      } else {
        main.calcSellAt(args.amount, args.sell_price, args.minimal);
      }
      break;

    case 'buy':
    case 'b':
      requiredFields(
        requiredField('price', 'Price option needed: use with -p <price>', false), 
        requiredField('amount', 'Amount option needed: use with -a <amount>', false)
      );
      
      main.buyLimitOrder(args.amount, args.price, args.minimal);
      break;

    case 'sell':
    case 's':
      requiredFields(
        requiredField('price', 'Price option needed: use with -p <price>', false), 
        requiredField('amount', 'Amount option needed: use with -a <amount>', false)
      );
      
      main.sellLimitOrder(args.amount, args.price, args.minimal);
      break;

    case 'cancel':
    case 'c':
      requiredField('id', 'id option needed: use with -i <id>');
      main.cancelOrder(args.id);
      break;

    case 'sellnow':
    case 'sn':
      requiredField('amount', 'Amount option needed: use with -a <amount>', false)
      main.sellNow(args.amount, args.minimal);
      break;

    default:
      logger.info('Please choose one at least one of the options'.red);
      args.outputHelp();
  }
} 

