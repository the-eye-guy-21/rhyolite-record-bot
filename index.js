const {
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');

const {
  attachArchiveMessage,
  closeScene,
  createScene,
  editScene,
  getSceneByThreadId,
  getSceneList,
  initializeDatabase,
  testDatabaseConnection,
} = require('./database');

const {
  publishSceneArchive,
  updateSceneArchive,
} = require('./archive');

const {
  requireModerator,
} = require('./permissions');

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

    let savedScene;

    try {
      savedScene = await createScene({
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

      return;
    }

    try {
      const archiveMessage = await publishSceneArchive(
        client,
        savedScene
      );

      await attachArchiveMessage({
        channelId: archiveMessage.channelId,
        messageId: archiveMessage.id,
        threadId: channel.id,
      });

      await interaction.editReply({
        content: [
          `**Incident File #${savedScene.id} has been created.**`,
          '',
          `**Title:** ${savedScene.title}`,
          `**Starting date:** ${capitalize(savedScene.start_season)} ${savedScene.start_day}, Year ${savedScene.start_year}`,
          `**Status:** ${capitalize(savedScene.status)}`,
          `**Public record:** ${archiveMessage.url}`,
          '',
          '*The clerk accepts no responsibility for temporal inconsistencies.*',
        ].join('\n'),
      });
    } catch (error) {
      console.error(
        'Scene saved, but archive publication failed:',
        error
      );

      await interaction.editReply({
        content: [
          `**Incident File #${savedScene.id} was saved successfully.**`,
          '',
          'The public archive card could not be posted. Please ask a moderator to check the Railway logs.',
          'Do not register the thread again; its database record already exists.',
        ].join('\n'),
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

  if (subcommand === 'edit') {
    const allowed = await requireModerator(
      interaction
    );

    if (!allowed) {
      return;
    }

    const channel = interaction.channel;

    if (!interaction.inGuild() || !channel || !channel.isThread()) {
      await interaction.reply({
        content: 'Please use `/scene edit` inside the RP thread whose record you want to correct.',
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    const title = interaction.options.getString('title');
    const location = interaction.options.getString('location');
    const characters = interaction.options.getString('characters');
    const premise = interaction.options.getString('premise');
    const startYear = interaction.options.getInteger('start_year');
    const startSeason = interaction.options.getString('start_season');
    const startDay = interaction.options.getInteger('start_day');
    const startDaypart = interaction.options.getString('start_daypart');

    if (
      title === null
      && location === null
      && characters === null
      && premise === null
      && startYear === null
      && startSeason === null
      && startDay === null
      && startDaypart === null
    ) {
      await interaction.editReply({
        content: 'No changes were supplied. Run `/scene edit` again and fill in at least one field.',
      });

      return;
    }

    let editedScene;

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

      editedScene = await editScene({
        threadId: channel.id,
        title: title,
        location: location,
        characters: characters,
        premise: premise,
        startYear: startYear,
        startSeason: startSeason,
        startDay: startDay,
        startDaypart: startDaypart,
      });
    } catch (error) {
      console.error('Could not edit scene:', error);

      await interaction.editReply({
        content: 'The scene record could not be edited. Please ask a moderator to check the Railway logs.',
      });

      return;
    }

    let updatedArchiveMessage = null;
    let archiveUpdateFailed = false;
    let archiveWasMissing = false;

    if (
      editedScene.archive_channel_id
      && editedScene.archive_message_id
    ) {
      try {
        updatedArchiveMessage = await updateSceneArchive(
          client,
          editedScene
        );
      } catch (error) {
        archiveUpdateFailed = true;

        console.error(
          'Scene edited, but archive update failed:',
          error
        );
      }
    } else {
      archiveWasMissing = true;
    }

    const confirmationLines = [
      `**Incident File #${editedScene.id} has been updated.**`,
      '',
      `**Title:** ${editedScene.title}`,
      `**Location:** ${editedScene.location}`,
      `**Characters:** ${editedScene.characters}`,
      `**Starting date:** ${capitalize(editedScene.start_season)} ${editedScene.start_day}, Year ${editedScene.start_year} — ${capitalize(editedScene.start_daypart)}`,
    ];

    if (updatedArchiveMessage) {
      confirmationLines.push(
        '',
        `**Public record updated:** ${updatedArchiveMessage.url}`
      );
    }

    if (archiveUpdateFailed) {
      confirmationLines.push(
        '',
        'The database record was updated, but the public archive card could not be refreshed. Use `/scene publish` to repair it.'
      );
    }

    if (archiveWasMissing) {
      confirmationLines.push(
        '',
        'This scene does not have a public archive card yet. Use `/scene publish` to create one.'
      );
    }

    await interaction.editReply({
      content: confirmationLines.join('\n'),
    });

    return;
  }

  if (subcommand === 'list') {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'Please use `/scene list` inside the Discord server.',
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    try {
      const scenes = await getSceneList(
        interaction.guildId
      );

      if (scenes.length === 0) {
        await interaction.editReply({
          content: 'No scene records have been filed yet.',
        });

        return;
      }

      const sceneListEmbed = new EmbedBuilder()
        .setTitle('Rhyolite Scene Records')
        .setDescription(
          'The ten latest scenes, arranged by their in-universe starting dates.'
        )
        .setFooter({
          text: 'The Rhyolite Record',
        });

      for (const scene of scenes) {
        sceneListEmbed.addFields({
          name: `#${scene.id}: ${truncate(scene.title, 80)}`,
          value: [
            `**Date:** ${capitalize(scene.start_season)} ${scene.start_day}, Year ${scene.start_year} — ${capitalize(scene.start_daypart)}`,
            `**Status:** ${capitalize(scene.status)}`,
            `**Location:** ${truncate(scene.location, 80)}`,
            `**Characters:** ${truncate(scene.characters, 180)}`,
            `[Open scene thread](${scene.thread_url})`,
          ].join('\n'),
        });
      }

      await interaction.editReply({
        embeds: [
          sceneListEmbed,
        ],
      });
    } catch (error) {
      console.error('Could not retrieve scene list:', error);

      await interaction.editReply({
        content: 'The scene list could not be opened. Please ask a moderator to check the Railway logs.',
      });
    }

    return;
  }

  if (subcommand === 'publish') {
    const allowed = await requireModerator(
      interaction
    );

    if (!allowed) {
      return;
    }

    const channel = interaction.channel;

    if (!interaction.inGuild() || !channel || !channel.isThread()) {
      await interaction.reply({
        content: 'Please use `/scene publish` inside the RP thread whose archive card you want to publish or repair.',
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
          content: 'This thread does not have a scene record yet. Use `/scene register` first.',
        });

        return;
      }

      if (
        savedScene.archive_channel_id
        && savedScene.archive_message_id
      ) {
        try {
          const updatedArchiveMessage = await updateSceneArchive(
            client,
            savedScene
          );

          await interaction.editReply({
            content: [
              `**Incident File #${savedScene.id} has been refreshed.**`,
              '',
              `**Public record:** ${updatedArchiveMessage.url}`,
              '',
              'The existing archive card was updated with the latest saved information.',
            ].join('\n'),
          });

          return;
        } catch (error) {
          console.error(
            'The existing archive card could not be refreshed. Attempting to create a replacement:',
            error
          );
        }
      }

      const archiveMessage = await publishSceneArchive(
        client,
        savedScene
      );

      await attachArchiveMessage({
        channelId: archiveMessage.channelId,
        messageId: archiveMessage.id,
        threadId: channel.id,
      });

      await interaction.editReply({
        content: [
          `**Incident File #${savedScene.id} has been published.**`,
          '',
          `**Status:** ${capitalize(savedScene.status)}`,
          `**Public record:** ${archiveMessage.url}`,
          '',
          'The archive card has been attached to this scene record.',
        ].join('\n'),
      });
    } catch (error) {
      console.error(
        'Could not publish or repair scene archive:',
        error
      );

      await interaction.editReply({
        content: 'The public archive card could not be published or repaired. Please ask a moderator to check the Railway logs.',
      });
    }

    return;
  }

  if (subcommand === 'close') {
    const allowed = await requireModerator(
      interaction
    );

    if (!allowed) {
      return;
    }

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

    let completedScene;

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

      completedScene = await closeScene({
        threadId: channel.id,
        finalSummary: finalSummary,
        endYear: endYear,
        endSeason: endSeason,
        endDay: endDay,
        endDaypart: endDaypart,
      });
    } catch (error) {
      console.error('Could not close scene:', error);

      await interaction.editReply({
        content: 'The scene could not be completed. Please ask a moderator to check the Railway logs.',
      });

      return;
    }

    let updatedArchiveMessage = null;
    let archiveUpdateFailed = false;
    let archiveWasMissing = false;

    if (
      completedScene.archive_channel_id
      && completedScene.archive_message_id
    ) {
      try {
        updatedArchiveMessage = await updateSceneArchive(
          client,
          completedScene
        );
      } catch (error) {
        archiveUpdateFailed = true;

        console.error(
          'Scene closed, but archive update failed:',
          error
        );
      }
    } else {
      archiveWasMissing = true;
    }

    const confirmationLines = [
      `**Incident File #${completedScene.id} has been closed.**`,
      '',
      `**Title:** ${completedScene.title}`,
      `**Status:** ${capitalize(completedScene.status)}`,
      `**Ending date:** ${capitalize(completedScene.end_season)} ${completedScene.end_day}, Year ${completedScene.end_year}`,
      `**Daypart:** ${capitalize(completedScene.end_daypart)}`,
      '',
      '**Final Summary**',
      completedScene.final_summary,
    ];

    if (updatedArchiveMessage) {
      confirmationLines.push(
        '',
        `**Public record updated:** ${updatedArchiveMessage.url}`
      );
    }

    if (archiveUpdateFailed) {
      confirmationLines.push(
        '',
        'The scene was closed successfully, but its public archive card could not be updated. Please ask a moderator to check the Railway logs.'
      );
    }

    if (archiveWasMissing) {
      confirmationLines.push(
        '',
        'The scene was closed successfully, but it does not have a saved public archive card yet. Use `/scene publish` to create one.'
      );
    }

    confirmationLines.push(
      '',
      '*The record has been filed. The timeline remains somebody else’s problem.*'
    );

    await interaction.editReply({
      content: confirmationLines.join('\n'),
    });

    return;
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

function truncate(text, maximumLength) {
  if (text.length <= maximumLength) {
    return text;
  }

  return `${text.slice(0, maximumLength - 3)}...`;
}

client.login(process.env.DISCORD_TOKEN);
