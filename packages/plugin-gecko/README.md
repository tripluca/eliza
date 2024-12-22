# `@ai16z/plugin-gecko`

This plugin provides actions and providers for interacting with CoinGecko API

---

## Configuration

### Default Setup

By default, \*_CoinGecko plugin_ is enabled. To use it, simply add your API key to the `.env` file:

```env
COINGECKO_API_KEY=your-gecko-key-here
```

## Provider

The **Coin Provider** gets the list of all the coins from Gecko API
https://docs.coingecko.com/v3.0.1/reference/coins-list
with its respective id,name and symbol, this can then be used for actions

---

## Actions

### Price

Get the current price and market cap of a coin/token from CoingGecko API, provide ticker or name of currency you want:

**Example usage:**

```env
Get me price of Pendle token
```

---
