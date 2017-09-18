'use strict'

const winston = require('winston');

const logger = new winston.Logger({
  transports: [
    new (winston.transports.Console)({
      colorize: true,
      timestamp: false,
      formatter: function(options) {
        // Return string will be passed to logger.
        return (options.message ? options.message : '') +
          (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
      }
    })
  ]
});

logger.spacedString = (str, minLength) => {
  str = str + '';
  for (let i = str.length; i< minLength; i++) {
    str += ' ';
  }
  return str;
};

logger.printAny = (str) => {
  return (str) ? str : '';
}

logger.printSE = (startStr, endStr, length = 50, sep = '.'.grey) => {
  let final = startStr;
  for (let i = 0; i < length - (startStr.length + endStr.length); i++) {
    final += sep
  }
  final += endStr;
  return final;
}


module.exports = logger;
