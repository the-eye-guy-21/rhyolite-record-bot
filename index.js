const {
  ActivityType,
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
  readyClient.user.setPresence({
    status: 'online',
    activities: [
      {
        name: 'the Rhyolite records',
        type: ActivityType.Watching,
      },
    ],
  });

  const guildNames = readyClient.guilds.cache.map((guild) => guild.name);

  console.log(`The Rhyolite Record is online as ${readyClient.user.tag}.`);
  console.log(`Bot user ID: ${readyClient.user.id}`);
  console.log(
    `Connected to ${guildNames.length} server(s): ${
      guildNames.length > 0 ? guildNames.join(', ') : 'none'
    }`
  );

  // Print once per minute so we can confirm that the process remains alive.
  setInterval(() => {
    console.log(`Heartbeat: connected at ${new Date().toISOString()}`);
  }, 60_000);
});

// Report unexpected Discord errors in Railway.
client.on(Events.Error, (error) => {
  console.error('Discord client error:', error);
});

// Clearly record when Railway asks the program to shut down.
process.on('SIGTERM', () => {
  console.log('Received SIGTERM from Railway. Disconnecting from Discord.');
  client.destroy();
  process.exit(0);
});

// Sign in using the private token stored in Railway.
client.login(process.env.DISCORD_TOKEN);
