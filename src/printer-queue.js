const _ = require('lodash')

exports.PrinterQueue = class {
  constructor () {
    this.q = [];
  }

  newLine(msg) {
    this.q.push(msg);
  }

  print(printer) {
    _.forEach(this.q, msg => {
      printer(msg);
    });
  }
}
