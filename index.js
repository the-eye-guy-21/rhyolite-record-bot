const {
  Client,
  Events,
  GatewayIntentBits,
} = require('discord.js');

// Stop immediately with a clear error if the bot token is missing.
if (!process.env.DISCORD_TOKEN) {
  console.error('Missing the DISCORD_TOKEN environment variable.');
  process.exit(1);
}

// Create the connection between this program and Discord.
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});

// Run this once Discord confirms that the bot is connected.
client.once(Events.ClientReady, (readyClient) => {
  console.log(`The Rhyolite Record is online as ${readyClient.user.tag}.`);
});

// Report unexpected Discord errors in the deployment logs.
client.on(Events.Error, (error) => {
  console.error('Discord client error:', error);
});

// Sign in using the private token that we will later store in Railway.
client.login(process.env.DISCORD_TOKEN);
