# Kprice-bot: A Kaspa Price and Market Data Discord Bot

## Overview

Kprice-bot is a Discord bot designed to fetch and display various types of data related to the Kaspa cryptocurrency. The bot can provide real-time price information, market data, address details, exchange data, and blockchain statistics directly within your Discord server.

## Features

- Get the current Kaspa price and market data
- Retrieve the balance, UTXOs, and transaction count of a Kaspa address
- Fetch market data from CoinGecko
- Display details about top Kaspa exchanges
- Show various Kaspa blockchain details such as hashrate, reward, and more

## Prerequisites

- Node.js v14.x or higher
- Discord Bot Token
- Kaspa API Key (if applicable)
- A server to host the bot (e.g., Heroku, AWS, or your own server)

## Commands

### `/kprice`
Get the current Kaspa market data.
- **Usage:** `/kprice`
- **Description:** Displays the current Kaspa price and market capitalization.

### `/kexchanges`
Get the top Kaspa exchanges with the highest trading volume.
- **Usage:** `/kexchanges`
- **Description:** Displays a list of top exchanges trading Kaspa, including the pair, price, volume, and a link to view the exchange.

### `/kbal`
Get the balance, UTXOs, and transaction count of a Kaspa address.
- **Usage:** `/kbal kaspaddress=<Kaspa_address>`
- **Description:** Provides details about a specified Kaspa address, including balance, UTXOs, and transaction count.

### `/kcoingecko`
Get Kaspa market data from CoinGecko.
- **Usage:** `/kcoingecko`
- **Description:** Displays current price, market cap, 24h volume, price change, ATH, and ATL from CoinGecko.

### `/khash-details`
Get various details about the Kaspa blockchain.
- **Usage:** `/khash-details`
- **Description:** Shows information such as the current hashrate, block rewards, next halving, blue score, and block DAG details.

## Example Usage

1. **Getting Kaspa Price:**
   ![Example](media/kprice_example.png)

2. **Fetching Address Details:**
   ![Example](media/kbal_example.png)

3. **Viewing Exchange Information:**
   ![Example](media/kexchanges_example.png)

## Contributing

Feel free to open issues or pull requests if you find any bugs or have suggestions for improvements.

## License
