#A CLI to interact with bitstamps api:
Provides you with valuable stats, such as fees paid, profit made and volume traded. Per month or per day. **Supports only Bitcoin (btc\_usd and btc\_eur).**

### You can
* List open orders
* Cancel orders
* Place limit orders (buy/sell)
* List all trades per day or month 
* List revenue and profit per day or month 
* Calculate profit if owned bitcoin was sold @ price P
* Calculate profit if a potential trade


---


## Configuration


---
## Usage

Create a *config.js* file. Use *config.sample.js* as a reference.

Install dependencies:

    npm install

Run:

    node index.js 

---

Supported options

    -o, --orders                 list all open orders
    -c, --cancel <id>            cancel order <id>
    -b, --buy <btc-amount>       place a buy limit order <btc amount> at set price, use with -p <price>
    -s, --sell <btc-amount>      place a sell limit order at set price, use with -p <price>
    -t, --trades                 trades
    -r, --revenue                revenue
    -x, --calc_sel <btc-amount>  Calculate profit when selling <amount> at set price, use with -p <price>
    -z, --calc_sel_buy <order>   Calculate profit with trade
    -p, --price <price>          sets price of request
    -m, --minimal                display minimal details
    -h, --help                   output usage information



---

### TODO
* Support all bitstamp curencies
* Pass currency or coin symbol via command line arg.
