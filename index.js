const {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');

const {
  testDatabaseConnection,
} = require('./database');

if (!process.env.DISCORD_TOKEN) {
  console.error('Missing the DISCORD_TOKEN environment variable.');
  process.exit(1);
}

const pingCommand = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Check whether The Rhyolite Record is responding.');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`The Rhyolite Record is online as ${readyClient.user.tag}.`);
  console.log(`Bot user ID: ${readyClient.user.id}`);

  const guildNames = readyClient.guilds.cache.map((guild) => guild.name);

  console.log(
    `Connected to ${guildNames.length} server(s): ${
      guildNames.length > 0 ? guildNames.join(', ') : 'none'
    }`
  );

  try {
    const databaseTime = await testDatabaseConnection();

    console.log(
      `PostgreSQL connected successfully. Database time: ${databaseTime}`
    );
  } catch (error) {
    console.error('Could not connect to PostgreSQL:', error);
  }

  for (const guild of readyClient.guilds.cache.values()) {
    try {
      await guild.commands.set([
        pingCommand.toJSON(),
      ]);

      console.log(`Registered /ping in ${guild.name}.`);
    } catch (error) {
      console.error(`Could not register /ping in ${guild.name}:`, error);
    }
  }

  setInterval(() => {
    console.log(`Heartbeat: connected at ${new Date().toISOString()}`);
  }, 60_000);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (interaction.commandName === 'ping') {
    await interaction.reply({
      content: 'The Rhyolite Record is connected and responding.',
      flags: MessageFlags.Ephemeral,
    });
  }
});

client.on(Events.Error, (error) => {
  console.error('Discord client error:', error);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM from Railway. Disconnecting from Discord.');
  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
