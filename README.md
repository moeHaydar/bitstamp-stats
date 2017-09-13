# A CLI to interact with bitstamps api:
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

  Options:

    -d, --do <action>         action to perform
    -i, --id <id>             sets id of request
    -p, --price <price>       sets price of request
    -b, --buy_price <price>   sets buy price of request
    -s, --sell_price <price>  sets sell price of request
    -a, --amount <amount>     sets amount of request
    -m, --minimal             display minimal details
    -h, --help                output usage information

  Supported actions:

    o, orders                                                  list all open orders
    c, cancel -id <id>                                         cancel order <id>
    t, trades                                                  lists all traders stats use
    r, revenue                                                 lists revenue stats use 
    b, buy -a <amount> -p <price>                              Sets a buy limit order use 
    s, sell -a <amount> -p <price>                             Sets a sell limit order use 
    sim, simulate -a <amount> -b* <buy price> -s <sell price>  Simulate a trade. -b is optional: If not set, then uses your available balance.

---

### TODO
* Support all bitstamp curencies
* Pass currency or coin symbol via command line arg.
