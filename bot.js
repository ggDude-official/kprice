require('dotenv').config();
const { Client, Intents, MessageEmbed, MessageAttachment } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const client = new Client({ 
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] 
});

const app = express();
const PORT = process.env.PORT || 3000;

const commands = [
  {
    name: 'kprice',
    description: 'Get the current Kaspa market data'
  },
  {
    name: 'kexchanges',
    description: 'Get the top Kaspa exchanges with highest trading volume'
  },
  {
    name: 'kbal',
    description: 'Get the balance, UTXOs, and transaction count of a Kaspa address',
    options: [
      {
        name: 'kaspaddress',
        type: 3, // Type 3 corresponds to String
        description: 'The Kaspa address to check',
        required: true,
      },
    ],
  },
  {
    name: 'kcoingecko',
    description: 'Get Kaspa market data from CoinGecko'
  },
  {
    name: 'khash-details',
    description: 'Get various details about the Kaspa blockchain',
  }
];

const headingFontColor = '#70C7BA';
//const kaspaLogoPath = path.join(__dirname, 'Media', 'kaspa_logo.png');
const API_BASE = 'https://api.kaspa.org/';

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_BOT_TOKEN);

// Cooldowns map to track command usage timestamps
const cooldowns = new Map();



async function media_imgs() {
  try {
    const embed = new MessageEmbed();

    // Attach Kaspa logo as thumbnail
    const imagePath = path.join(__dirname, 'Media', 'kaspa_logo.png'); // Adjust path as needed
    embed.setThumbnail('attachment://kaspa_logo.png'); // Set image as thumbnail

    // Return embed and file attachment
    return { embed, files: [{ attachment: imagePath, name: 'kaspa_logo.png' }] };
  } catch (error) {
    ////console.error('Error creating Kaspa embed:', error);
    throw error;
  }
}
async function getKaspaAddressDetails(kaspaAddress) {
  //console.log(`Fetching details for Kaspa address: ${kaspaAddress}...`);
  
  try {
    const [balanceResponse, utxosResponse, transactionsCountResponse] = await Promise.all([
      fetch(`${API_BASE}addresses/${encodeURIComponent(kaspaAddress)}/balance`),
      fetch(`${API_BASE}addresses/${encodeURIComponent(kaspaAddress)}/utxos`),
      fetch(`${API_BASE}addresses/${encodeURIComponent(kaspaAddress)}/transactions-count`)
    ]);

    const balanceData = await balanceResponse.json();
    const utxosData = await utxosResponse.json();
    const transactionsCountData = await transactionsCountResponse.json();

    let balanceInKAS = balanceData.balance / 100000000; // Convert from sompi to Kaspa

    if (!Number.isFinite(balanceInKAS)) {
      throw new Error('Invalid balance value received from API');
    }

    return {
      balance: balanceInKAS,
      utxos: utxosData.length,
      transactionsCount: transactionsCountData.total,
    };
  } catch (error) {
    //console.error('Error fetching Kaspa address details:', error);
    throw error;
  }
}
async function getKaspaPrice() {
  try {
    const response = await fetch(`${API_BASE}info/price`);
    const data = await response.json();
    return data;
  } catch (error) {
    //console.error('Error fetching Kaspa price:', error);
    throw error;
  }
}
async function getKaspaMarketCap() {
  try {
    const response = await fetch(`${API_BASE}info/marketcap`);
    const data = await response.json();
    return data;
  } catch (error) {
    //console.error('Error fetching Kaspa market cap:', error);
    throw error;
  }
}
async function getKaspaHashrate() {
  const API_BASE = 'https://api.kaspa.org/info/hashrate';

  try {
    const response = await fetch(API_BASE);
    const data = await response.json();

    // Retrieve the hashrate value from the JSON data (in TH/s)
    let hashrate = data.hashrate;

    // Convert TH/s to H/s (1 TH/s = 1e12 H/s)
    hashrate *= 1e12;

    // Define the units and their thresholds
    const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s'];
    const thresholds = [1, 1e3, 1e6, 1e9, 1e12, 1e15, 1e18];

    let unitIndex = 0;
    while (hashrate >= thresholds[unitIndex + 1] && unitIndex < units.length - 1) {
      unitIndex++;
    }

    // Convert hashrate to the appropriate unit
    hashrate /= thresholds[unitIndex];

    // Determine the number of decimal places
    let decimals = 2;
    if (unitIndex === 0 || hashrate >= 100) {
      decimals = 2;
    } else if (hashrate >= 10) {
      decimals = 1;
    }

    let formattedHashrate = `${hashrate.toFixed(decimals)} ${units[unitIndex]}`;

    return formattedHashrate;
  } catch (error) {
    //console.error('Error fetching Kaspa hashrate:', error);
    throw error;
  }
}
async function getKaspaCurrentReward() {
  const API_REWARD = 'https://api.kaspa.org/info/blockreward';
  try {
    const response = await fetch(API_REWARD);
    const data = await response.json();

    if (!data.blockreward) {
      throw new Error('Invalid data received from API');
    }

    return {
      currentBlockReward: data.blockreward // Directly assign the value
    };
  } catch (error) {
    //console.error('Error fetching Kaspa current reward:', error);
    throw error;
  }
}
async function getKaspaBlueScore() {
  const API_BLUE_SCORE = 'https://api.kaspa.org/info/virtual-chain-blue-score';
  try {
    const response = await fetch(API_BLUE_SCORE);
    const data = await response.json();

    if (!data.blueScore) {
      throw new Error('Invalid data received from API');
    }

    return {
      blueScore: data.blueScore.toLocaleString() // Add commas for readability
    };
  } catch (error) {
    //console.error('Error fetching Kaspa blue score:', error);
    throw error;
  }
}
async function getKaspaBlockDag() {
  const API_BLOCKDAG = 'https://api.kaspa.org/info/blockdag';
  try {
    const response = await fetch(API_BLOCKDAG);
    const data = await response.json();

    if (!data.networkName || !data.blockCount || !data.headerCount) {
      throw new Error('Invalid data received from API');
    }

    // Format blockCount and headerCount with commas
    const formattedBlockCount = data.blockCount.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const formattedHeaderCount = data.headerCount.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    return {
      networkName: data.networkName,
      blockCount: formattedBlockCount,
      headerCount: formattedHeaderCount
    };
  } catch (error) {
    //console.error('Error fetching Kaspa block DAG data:', error);
    throw error;
  }
}
async function getKaspaHalving() {
  const API_BASE = 'https://api.kaspa.org/info/halving';
  try {
    const response = await fetch(API_BASE);
    const data = await response.json();

    // Format next halving date
    const nextHalvingDate = new Date(data.nextHalvingTimestamp * 1000);
    const formattedNextHalving = `${data.nextHalvingAmount.toFixed(8)} KAS\non ${nextHalvingDate.toUTCString().split(' ').slice(0, 4).join(' ')}\n${nextHalvingDate.toUTCString().split(' ').slice(4).join(' ')}`;

    return {
      nextHalvingTimestamp: data.nextHalvingTimestamp,
      nextHalvingDate: nextHalvingDate.toUTCString(),
      nextHalvingAmount: data.nextHalvingAmount.toFixed(8),
      formattedNextHalving: formattedNextHalving // Add formattedNextHalving to the return object
    };
  } catch (error) {
    //console.error('Error fetching Kaspa halving details:', error);
    throw error;
  }
}
async function getKaspaData() {
  //console.log('Fetching Kaspa data from CoinGecko...');
  const API_BASE = 'https://api.coingecko.com/api/v3/';
  const params = new URLSearchParams({
    ids: 'kaspa',
    vs_currency: 'usd'
  });

  try {
    const response = await fetch(`${API_BASE}coins/markets?${params}`);
    const data = await response.json();
    //console.log('Parsed JSON data:', data);
    return data[0]; // Assuming 'kaspa' is the first (and only) result
  } catch (error) {
    //console.error('Error fetching Kaspa data from CoinGecko:', error);
    throw error;
  }
}
async function getKaspaExchanges() {
  //console.log('Fetching Kaspa exchanges...');
  const API_BASE = 'https://api.coingecko.com/api/v3/';
  const params = new URLSearchParams({
    ids: 'kaspa',
    order: 'trust_score_desc'
  });

  try {
    const response = await fetch(`${API_BASE}coins/kaspa/tickers?order=trust_score_desc`);
    const data = await response.json();

    // Filter and get the top 8 exchanges
    const topExchanges = data.tickers.filter(ticker =>
      ticker.target_coin_id === 'tether' &&
      ticker.coin_id === 'kaspa'
    ).slice(0, 9);

    //console.log('Top Kaspa exchanges:', topExchanges);

    return topExchanges;
  } catch (error) {
    //console.error('Error fetching Kaspa exchanges:', error);
    throw error;
  }
}

// display numbers with letters to make it easy to read 
function formatNumber(number) {
  if (isNaN(number) || number === 0) return '0';

  const absNumber = Math.abs(number);
  const million = 1000000;
  const billion = 1000000000;
  const trillion = 1000000000000;

  if (absNumber >= trillion) {
    return `${(number / trillion).toFixed(2)}T`;
  } else if (absNumber >= billion) {
    return `${(number / billion).toFixed(2)}B`;
  } else if (absNumber >= million) {
    return `${(number / million).toFixed(2)}M`;
  } else {
    return number.toFixed(2);
  }
}
// 15 minutes timer on exchange and coingecko cmds  based on users
client.on('ready', async () => {
  //console.log(`Logged in as ${client.user.tag}`);

  try {
    //console.log('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands },
    );
    //console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    //console.error('Error refreshing application commands:', error);
  }
});
// 15 minutes timer on exchange and coingecko cmds 
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName, options, user } = interaction;
  const userId = user.id;

  // Cooldown setup
  const now = Date.now();
  const cooldownTime = 15 * 60 * 1000; // 15 minutes cooldown in milliseconds

  // Check if the command is one of the commands with cooldown
  if (commandName === 'kexchanges' || commandName === 'kcoingecko') {
    if (cooldowns.has(userId)) {
      const expirationTime = cooldowns.get(userId).get(commandName) + cooldownTime;
      if (now < expirationTime) {
        const timeLeft = expirationTime - now;
        const minutesLeft = Math.floor((timeLeft / (1000 * 60)) % 60);
        const secondsLeft = Math.floor((timeLeft / 1000) % 60);
        await interaction.reply(`Please wait for **${minutesLeft} minutes and ${secondsLeft} seconds** before reusing the \`${commandName}\` command.`);
        return;
      }
    }
  }

  // Process commands
  try {
    switch (commandName) {
      case 'kprice':
        await handlePriceCommand(interaction);
        break;
      case 'kexchanges':
        await handleExchangesCommand(interaction);
        break;
      case 'kbal':
        await handleBalCommand(interaction, options);
        break;
      case 'kcoingecko':
        await handleCoingeckoCommand(interaction);
        break;
      case 'khash-details':
        await handleHashDetailsCommand(interaction);
        break;
      default:
        break;
    }

    // Set cooldown after successful command execution
    if (commandName === 'kexchanges' || commandName === 'kcoingecko') {
      if (!cooldowns.has(userId)) {
        cooldowns.set(userId, new Map());
      }
      cooldowns.get(userId).set(commandName, now);
      setTimeout(() => {
        if (cooldowns.has(userId)) {
          cooldowns.get(userId).delete(commandName);
          if (cooldowns.get(userId).size === 0) {
            cooldowns.delete(userId);
          }
        }
      }, cooldownTime);
    }
  } catch (error) {
    //console.error(`Error handling ${commandName} command:`, error);
    await interaction.reply(`There was an error while executing the \`${commandName}\` command.`);
  }
});

// kprice details call
async function handlePriceCommand(interaction) {
  try {
    const priceData = await getKaspaPrice();
    const marketCapData = await getKaspaMarketCap();

    const embed = new MessageEmbed()
      .setTitle('Kaspa Price & Market Data')
      .setColor('#0099ff')
      .setThumbnail('attachment://kaspa_logo.png')
      .addFields(
        { name: '💵 Current Kaspa Price', value: `$${priceData.price.toFixed(6)} KAS`, inline: false },
        { name: '📊 Market Cap', value: `$${formatNumber(marketCapData.marketcap)}`, inline: false }
      );

    // Retrieve embed and file attachment from media_imgs function
    const { embed: mediaEmbed, files } = await media_imgs();

    // Update embed with media data
    embed.addFields(mediaEmbed.fields); // Add fields from media embed

    // Return embed with attached image
    await interaction.reply({
      embeds: [embed],
      files: files
    });
  } catch (error) {
    //console.error('Error handling price command:', error);
    await interaction.reply('There was an error fetching the Kaspa market data.');
  }
}
// k exchanges details call 15 minutes timer
async function handleExchangesCommand(interaction) {
  try {
    const exchangesData = await getKaspaExchanges();

    // Retrieve embed and file attachment from media_imgs function
    const { embed: mediaEmbed, files } = await media_imgs();

    const embed = new MessageEmbed()
      .setTitle('📊 Top Kaspa Exchanges')
      .setColor('#0099ff')
      .setThumbnail('attachment://kaspa_logo.png') // Set media file as thumbnail
      .setDescription('**Kaspa Exchange Data**');

    exchangesData.forEach((exchange, index) => {
      embed.addFields(
        {
          name: `**${index + 1}. ${exchange.market.name}**`,
          value: `🔄 **Pair:** ${exchange.base}/${exchange.target}\n` +
            `💵 **Price:** $${exchange.last}\n` +
            `📊 **Volume:** $${formatNumber(exchange.volume)}\n` +
            `[🔍 VIEW](${exchange.trade_url})`,
          inline: true // Set inline to true for all fields
        }
      );
    });

    // Add additional fields from media embed
    embed.addFields(mediaEmbed.fields);

    // Return embed with attached image
    await interaction.reply({
      embeds: [embed],
      files: files
    });
  } catch (error) {
    //console.error('Error handling exchanges command:', error);
    await interaction.reply('There was an error fetching the Kaspa exchanges data.');
  }
}

// Kbal details call use : /kbal {KASPA:address}
async function handleBalCommand(interaction, options) {
  const kaspaAddress = options.getString('kaspaddress');

  try {
    const addressDetails = await getKaspaAddressDetails(kaspaAddress);

    // Retrieve embed and file attachment from media_imgs function
    const { embed: mediaEmbed, files } = await media_imgs();

    const embed = new MessageEmbed()
      .setTitle('🔍 Kaspa Address Details')
      .setColor('#0099ff')
      .setDescription(
        `**📍 Address:** ${kaspaAddress}\n` +
        `**💰 Balance:** ${addressDetails.balance} KAS\n` +
        `**🔗 UTXOs:** ${addressDetails.utxos}\n` +
        `**📈 Transaction Count:** ${addressDetails.transactionsCount}`
      )
      .setThumbnail('attachment://kaspa_logo.png') // Set media file as thumbnail
      


    // Return embed with attached image
    await interaction.reply({
      embeds: [embed],
      files: files
    });
  } catch (error) {
    //console.error('Error handling bal command:', error);
    await interaction.reply('There was an error fetching the Kaspa address details.');
  }
}

// Kcoingecko details call 15 minutes timer
async function handleCoingeckoCommand(interaction) {
  try {
    const data = await getKaspaData();

    if (!data) {
      await interaction.reply('No data found for Kaspa on CoinGecko.');
      return;
    }

    // Retrieve embed and file attachment from media_imgs function
    const { embed: mediaEmbed, files } = await media_imgs();

    const embed = new MessageEmbed()
      .setTitle('📈 Kaspa Market Data')
      .setColor('#0099ff')
      .setThumbnail('attachment://kaspa_logo.png') // Set media file as thumbnail
      .setDescription('**Kaspa CoinGecko Data**')
      .addFields(
        { name: '📊 **Current Price**', value: `$${data.current_price.toFixed(4)}`, inline: true },
        { name: '💰 **Market Cap**', value: `$${formatNumber(data.market_cap)}`, inline: true },
        { name: '📈 **24h Volume**', value: `$${formatNumber(data.total_volume)}`, inline: true },
        { name: '🔄 **Change (24h)**', value: `${data.price_change_percentage_24h.toFixed(2)}%`, inline: true },
        { name: '🚀 **ATH-24H**', value: `$${data.high_24h.toFixed(4)}`, inline: true },
        { name: '📉 **ATL-24H**', value: `$${data.low_24h.toFixed(4)}`, inline: true }
      )
      

    // Add additional fields from media embed
    embed.addFields(mediaEmbed.fields);

    // Return embed with attached image
    await interaction.reply({
      embeds: [embed],
      files: files
    });
  } catch (error) {
    //console.error('Error handling coingecko command:', error);
    await interaction.reply('There was an error fetching the Kaspa market data from CoinGecko.');
  }
}
// khash details call 
async function handleHashDetailsCommand(interaction) {
  await interaction.deferReply();
  try {
    // Fetch necessary data
    const [halvingData, rewardData, hashrateData, blueScoreData, blockDagData] = await Promise.all([
      getKaspaHalving(),
      getKaspaCurrentReward(),
      getKaspaHashrate(),
      getKaspaBlueScore(),
      getKaspaBlockDag()
    ]);

    // Create embed with attached image
    const embedData = new MessageEmbed()
      .setTitle('🔗 Kaspa Blockchain Details')
      .setDescription('**Various details about the Kaspa blockchain:**')
      .addFields(
        { name: '📊 **Current Hashrate**', value: `\`\`\`${hashrateData}\`\`\``, inline: false },
        { name: '🎁 **Rewards**', value: '```\nReward Information\n```', inline: false },
        { name: '💰 **Current Reward**', value: `${rewardData.currentBlockReward} KAS`, inline: true },
        { name: '⏳ **Next Halving**', value: halvingData.formattedNextHalving, inline: true },
        { name: '🔗 **BlockDAG Details**', value: '```\nNetwork Information\n```', inline: false },
        { name: '🌐 **Network Name**', value: blockDagData.networkName, inline: false },
        { name: '🧱 **Block Count**', value: blockDagData.blockCount, inline: true },
        { name: '📑 **Header Count**', value: blockDagData.headerCount, inline: true },
        { name: '📘 **Blue Score**', value: blueScoreData.blueScore, inline: true }
      );

    // Retrieve embed and file attachment from media_imgs function
    const { embed: mediaEmbed, files } = await media_imgs();

    // Set the fields and thumbnail from the created embed
    embedData.addFields(mediaEmbed.fields);
    embedData.setThumbnail(mediaEmbed.thumbnail.url);

    // Send embed with attached image
    await interaction.editReply({ embeds: [embedData], files: files });
  } catch (error) {
    //console.error('Error handling hash-details command:', error);
    await interaction.editReply('There was an error while fetching Kaspa blockchain details.');
  }
}

client.login(process.env.DISCORD_BOT_TOKEN);

app.listen(PORT, () => {
  //console.log(`Server running on port ${PORT}`);
});
