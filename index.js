const {
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');

const {
  initializeDatabase,
  testDatabaseConnection,
} = require('./database');

const {
  sceneCommand,
} = require('./scene-command');

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

  try {
    await initializeDatabase();

    const databaseTime = await testDatabaseConnection();

    console.log(
      `PostgreSQL connected successfully. Database time: ${databaseTime}`
    );
  } catch (error) {
    console.error('Could not initialize PostgreSQL:', error);
  }

  const commands = [
    pingCommand.toJSON(),
    sceneCommand.toJSON(),
  ];

  for (const guild of readyClient.guilds.cache.values()) {
    try {
      await guild.commands.set(commands);

      console.log(
        `Registered /ping and /scene in ${guild.name}.`
      );
    } catch (error) {
      console.error(
        `Could not register commands in ${guild.name}:`,
        error
      );
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

    return;
  }

  if (
    interaction.commandName === 'scene'
    && interaction.options.getSubcommand() === 'register'
  ) {
    const title = interaction.options.getString(
      'title',
      true
    );

    const location = interaction.options.getString(
      'location',
      true
    );

    const characters = interaction.options.getString(
      'characters',
      true
    );

    const premise = interaction.options.getString(
      'premise',
      true
    );

    const startYear = interaction.options.getInteger(
      'start_year',
      true
    );

    const startSeason = interaction.options.getString(
      'start_season',
      true
    );

    const startDay = interaction.options.getInteger(
      'start_day',
      true
    );

    const startDaypart = interaction.options.getString(
      'start_daypart',
      true
    );

    await interaction.reply({
      content: [
        '**Scene information received successfully.**',
        '',
        `**Title:** ${title}`,
        `**Location:** ${location}`,
        `**Characters:** ${characters}`,
        `**Starting date:** ${capitalize(startSeason)} ${startDay}, Year ${startYear}`,
        `**Daypart:** ${capitalize(startDaypart)}`,
        `**Premise:** ${premise}`,
        '',
        'This is only a test. The scene has not been saved yet.',
      ].join('\n'),
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

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

client.login(process.env.DISCORD_TOKEN);
