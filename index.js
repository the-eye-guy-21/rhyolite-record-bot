const {
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');

const {
  closeScene,
  createScene,
  getSceneByThreadId,
  initializeDatabase,
  testDatabaseConnection,
} = require('./database');

const {
  calendarCommand,
} = require('./calendar-command');

const {
  handleCalendarCommand,
} = require('./calendar-handler');

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
    calendarCommand.toJSON(),
  ];

  for (const guild of readyClient.guilds.cache.values()) {
    try {
      await guild.commands.set(commands);

      console.log(
        `Registered /ping, /scene, and /calendar in ${guild.name}.`
      );
    } catch (error) {
      console.error(
        `Could not register commands in ${guild.name}:`,
        error
      );
    }
  }
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

  if (interaction.commandName === 'calendar') {
    await handleCalendarCommand(interaction);

    return;
  }

  if (interaction.commandName !== 'scene') {
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'register') {
    const channel = interaction.channel;

    if (!interaction.inGuild() || !channel || !channel.isThread()) {
      await interaction.reply({
        content: 'Please use `/scene register` inside the RP thread you want to record.',
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

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

    try {
      const savedScene = await createScene({
        guildId: interaction.guildId,
        threadId: channel.id,
        threadName: channel.name,
        threadUrl: channel.url,
        title: title,
        location: location,
        characters: characters,
        premise: premise,
        startYear: startYear,
        startSeason: startSeason,
        startDay: startDay,
        startDaypart: startDaypart,
        createdByUserId: interaction.user.id,
      });

      await interaction.editReply({
        content: [
          `**Incident File #${savedScene.id} has been created.**`,
          '',
          `**Title:** ${savedScene.title}`,
          `**Location:** ${savedScene.location}`,
          `**Characters:** ${savedScene.characters}`,
          `**Starting date:** ${capitalize(savedScene.start_season)} ${savedScene.start_day}, Year ${savedScene.start_year}`,
          `**Daypart:** ${capitalize(savedScene.start_daypart)}`,
          `**Status:** ${capitalize(savedScene.status)}`,
          `**Thread:** ${savedScene.thread_url}`,
          '',
          '*The clerk accepts no responsibility for temporal inconsistencies.*',
        ].join('\n'),
      });
    } catch (error) {
      if (error.code === '23505') {
        await interaction.editReply({
          content: 'This thread already has a scene record.',
        });

        return;
      }

      console.error('Could not save scene:', error);

      await interaction.editReply({
        content: 'The scene could not be saved. Please ask a moderator to check the Railway logs.',
      });
    }

    return;
  }

  if (subcommand === 'view') {
    const channel = interaction.channel;

    if (!interaction.inGuild() || !channel || !channel.isThread()) {
      await interaction.reply({
        content: 'Please use `/scene view` inside the RP thread you want to examine.',
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    try {
      const savedScene = await getSceneByThreadId(
        channel.id
      );

      if (!savedScene) {
        await interaction.editReply({
          content: 'This thread does not have a scene record yet.',
        });

        return;
      }

      const descriptionLines = [
        '**Premise**',
        savedScene.premise,
      ];

      if (
        savedScene.status === 'completed'
        && savedScene.final_summary
      ) {
        descriptionLines.push(
          '',
          '**Final Summary**',
          savedScene.final_summary
        );
      }

      const sceneEmbed = new EmbedBuilder()
        .setTitle(
          `Incident File #${savedScene.id}: ${savedScene.title}`
        )
        .setURL(savedScene.thread_url)
        .setDescription(
          descriptionLines.join('\n')
        )
        .addFields(
          {
            name: 'Location',
            value: savedScene.location,
          },
          {
            name: 'Characters',
            value: savedScene.characters,
          },
          {
            name: 'Starting Date',
            value: `${capitalize(savedScene.start_season)} ${savedScene.start_day}, Year ${savedScene.start_year} — ${capitalize(savedScene.start_daypart)}`,
          },
          {
            name: 'Status',
            value: capitalize(savedScene.status),
          },
          {
            name: 'Recorded Thread',
            value: `[Open the thread](${savedScene.thread_url})`,
          }
        )
        .setFooter({
          text: 'The Rhyolite Record',
        });

      if (
        savedScene.status === 'completed'
        && savedScene.end_year
      ) {
        sceneEmbed.addFields({
          name: 'Ending Date',
          value: `${capitalize(savedScene.end_season)} ${savedScene.end_day}, Year ${savedScene.end_year} — ${capitalize(savedScene.end_daypart)}`,
        });
      }

      if (savedScene.status === 'completed') {
        sceneEmbed.setTimestamp(
          new Date(savedScene.updated_at)
        );
      } else {
        sceneEmbed.setTimestamp(
          new Date(savedScene.created_at)
        );
      }

      await interaction.editReply({
        embeds: [
          sceneEmbed,
        ],
      });
    } catch (error) {
      console.error('Could not retrieve scene:', error);

      await interaction.editReply({
        content: 'The scene record could not be opened. Please ask a moderator to check the Railway logs.',
      });
    }

    return;
  }

  if (subcommand === 'close') {
    const channel = interaction.channel;

    if (!interaction.inGuild() || !channel || !channel.isThread()) {
      await interaction.reply({
        content: 'Please use `/scene close` inside the RP thread you want to complete.',
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    const finalSummary = interaction.options.getString(
      'final_summary',
      true
    );

    const endYear = interaction.options.getInteger(
      'end_year',
      true
    );

    const endSeason = interaction.options.getString(
      'end_season',
      true
    );

    const endDay = interaction.options.getInteger(
      'end_day',
      true
    );

    const endDaypart = interaction.options.getString(
      'end_daypart',
      true
    );

    try {
      const existingScene = await getSceneByThreadId(
        channel.id
      );

      if (!existingScene) {
        await interaction.editReply({
          content: 'This thread does not have a scene record yet. Use `/scene register` first.',
        });

        return;
      }

      if (existingScene.status === 'completed') {
        await interaction.editReply({
          content: 'This scene has already been completed.',
        });

        return;
      }

      const completedScene = await closeScene({
        threadId: channel.id,
        finalSummary: finalSummary,
        endYear: endYear,
        endSeason: endSeason,
        endDay: endDay,
        endDaypart: endDaypart,
      });

      await interaction.editReply({
        content: [
          `**Incident File #${completedScene.id} has been closed.**`,
          '',
          `**Title:** ${completedScene.title}`,
          `**Status:** ${capitalize(completedScene.status)}`,
          `**Ending date:** ${capitalize(completedScene.end_season)} ${completedScene.end_day}, Year ${completedScene.end_year}`,
          `**Daypart:** ${capitalize(completedScene.end_daypart)}`,
          '',
          '**Final Summary**',
          completedScene.final_summary,
          '',
          '*The record has been filed. The timeline remains somebody else’s problem.*',
        ].join('\n'),
      });
    } catch (error) {
      console.error('Could not close scene:', error);

      await interaction.editReply({
        content: 'The scene could not be completed. Please ask a moderator to check the Railway logs.',
      });
    }
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
