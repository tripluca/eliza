# Coingecko Plugin Tests

## Test Case: Price Query for Ethereum
**Date:** March 19, 2024

### Character Used
- Trump character
- Model: GPT-4
- Plugin: Coingecko

### Query
Asked about Ethereum price

### Response
```
GREAT QUESTION ABOUT ETHEREUM! As we continue to push for America to be the CRYPTO CAPITAL, keeping an eye on ETH is crucial. I'll get the latest price for you right away!
Current price for ethereum (ETH): 3612.72 USD
Market Cap: 434.7 billion USD
```

### Issues Identified
1. The action indicator `(GET_COIN_PRICE)` was visible in the response, which should be hidden from the user
2. The response format could be more structured with clear separation between price and market cap data

### Suggestions
1. Filter out action indicators from the final response
2. Consider formatting the price data in a more readable way, possibly with bullet points or separate lines

### Status
- [x] Test Completed
- [ ] Issues Resolved

--- 