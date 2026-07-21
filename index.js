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
  closeSceneById,
  createAdditionalScene,
  createScene,
  deleteSceneById,
  editSceneById,
  getSceneById,
  getSceneList,
  getScenesByThreadId,
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

const protectedSceneCommands = new Set([
  'register-additional',
  'edit',
  'close',
  'publish',
  'delete',
  'delete-file',
]);

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

  if (protectedSceneCommands.has(subcommand)) {
    const allowed = await requireModerator(
      interaction
    );

    if (!allowed) {
      return;
    }
  }

  try {
    switch (subcommand) {
      case 'register':
        await handleRegister(interaction, false);
        break;

      case 'register-additional':
        await handleRegister(interaction, true);
        break;

      case 'view':
        await handleView(interaction);
        break;

      case 'edit':
        await handleEdit(interaction);
        break;

      case 'delete':
        await handleDeleteInThread(interaction);
        break;

      case 'delete-file':
        await handleDeleteByNumber(interaction);
        break;

      case 'list':
        await handleList(interaction);
        break;

      case 'publish':
        await handlePublish(interaction);
        break;

      case 'close':
        await handleClose(interaction);
        break;

      default:
        await interaction.reply({
          content: 'That scene command is not available.',
          flags: MessageFlags.Ephemeral,
        });
    }
  } catch (error) {
    console.error(
      `Unexpected error while handling /scene ${subcommand}:`,
      error
    );

    const errorMessage =
      'The command could not be completed. Please ask a moderator to check the Railway logs.';

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        content: errorMessage,
        embeds: [],
      }).catch(() => {});
    } else {
      await interaction.reply({
        content: errorMessage,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  }
});

async function handleRegister(
  interaction,
  allowAdditional
) {
  const channel = interaction.channel;

  if (!isUsableThread(interaction, channel)) {
    await interaction.reply({
      content: allowAdditional
        ? 'Please use `/scene register-additional` inside the reused RP thread.'
        : 'Please use `/scene register` inside the RP thread you want to record.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  if (allowAdditional) {
    const existingScenes = await getScenesByThreadId(
      channel.id
    );

    if (existingScenes.length === 0) {
      await interaction.editReply({
        content: 'This thread does not have a first incident file yet. Use `/scene register` before adding another one.',
      });

      return;
    }
  }

  const startingMessageInput = allowAdditional
    ? interaction.options.getString('starting_message')
    : null;

  let startingMessageUrl = null;

  if (startingMessageInput !== null) {
    const validation = validateStartingMessageUrl(
      startingMessageInput,
      interaction.guildId,
      channel.id
    );

    if (!validation.valid) {
      await interaction.editReply({
        content: validation.message,
      });

      return;
    }

    startingMessageUrl = validation.url;
  }

  const sceneData = {
    guildId: interaction.guildId,
    threadId: channel.id,
    threadName: channel.name,
    threadUrl: channel.url,
    startingMessageUrl: startingMessageUrl,
    title: interaction.options.getString('title', true),
    location: interaction.options.getString('location', true),
    characters: interaction.options.getString('characters', true),
    premise: interaction.options.getString('premise', true),
    startYear: interaction.options.getInteger('start_year', true),
    startSeason: interaction.options.getString('start_season', true),
    startDay: interaction.options.getInteger('start_day', true),
    startDaypart: interaction.options.getString('start_daypart', true),
    createdByUserId: interaction.user.id,
  };

  let savedScene;

  try {
    savedScene = allowAdditional
      ? await createAdditionalScene(sceneData)
      : await createScene(sceneData);
  } catch (error) {
    if (error.code === '23505') {
      await interaction.editReply({
        content: [
          'This thread already has a scene record.',
          '',
          'A moderator can use `/scene register-additional` when the thread was deliberately reused for another scene.',
        ].join('\n'),
      });

      return;
    }

    throw error;
  }

  try {
    const archiveMessage = await publishAndAttach(
      savedScene
    );

    const confirmationLines = [
      `**Incident File #${savedScene.id} has been created.**`,
      '',
      `**Title:** ${savedScene.title}`,
      `**Starting date:** ${formatSceneDate(savedScene)}`,
      `**Status:** ${capitalize(savedScene.status)}`,
      `**Public record:** ${archiveMessage.url}`,
    ];

    if (savedScene.starting_message_url) {
      confirmationLines.push(
        `**Scene begins here:** ${savedScene.starting_message_url}`
      );
    }

    confirmationLines.push(
      '',
      allowAdditional
        ? '*A second file has been opened for this magnificently overworked thread.*'
        : '*The clerk accepts no responsibility for temporal inconsistencies.*'
    );

    await interaction.editReply({
      content: confirmationLines.join('\n'),
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
        `Use \`/scene publish file_number: ${savedScene.id}\` to repair it later.`,
      ].join('\n'),
    });
  }
}

async function handleView(interaction) {
  const channel = interaction.channel;

  if (!isUsableThread(interaction, channel)) {
    await interaction.reply({
      content: 'Please use `/scene view` inside the RP thread you want to examine.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  const fileNumber = interaction.options.getInteger(
    'file_number'
  );

  const scenes = await getScenesByThreadId(
    channel.id
  );

  if (scenes.length === 0) {
    await interaction.editReply({
      content: 'This thread does not have a scene record yet.',
    });

    return;
  }

  if (fileNumber !== null) {
    const selectedScene = findSceneByNumber(
      scenes,
      fileNumber,
      interaction.guildId
    );

    if (!selectedScene) {
      await interaction.editReply({
        content: `Incident File #${fileNumber} is not attached to this thread.`,
      });

      return;
    }

    await interaction.editReply({
      embeds: [
        buildSceneEmbed(selectedScene),
      ],
    });

    return;
  }

  if (scenes.length === 1) {
    await interaction.editReply({
      embeds: [
        buildSceneEmbed(scenes[0]),
      ],
    });

    return;
  }

  await interaction.editReply({
    embeds: [
      buildThreadSceneListEmbed(scenes),
    ],
  });
}

async function handleEdit(interaction) {
  const channel = interaction.channel;

  if (!isUsableThread(interaction, channel)) {
    await interaction.reply({
      content: 'Please use `/scene edit` inside the RP thread whose record you want to correct.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  const resolution = await resolveSceneForManagement(
    channel.id,
    interaction.guildId,
    interaction.options.getInteger('file_number')
  );

  if (!resolution.scene) {
    await interaction.editReply({
      content: resolution.message,
    });

    return;
  }

  const startingMessageInput =
    interaction.options.getString('starting_message');

  let startingMessageUrl = null;

  if (startingMessageInput !== null) {
    const validation = validateStartingMessageUrl(
      startingMessageInput,
      interaction.guildId,
      channel.id
    );

    if (!validation.valid) {
      await interaction.editReply({
        content: validation.message,
      });

      return;
    }

    startingMessageUrl = validation.url;
  }

  const changes = {
    title: interaction.options.getString('title'),
    location: interaction.options.getString('location'),
    characters: interaction.options.getString('characters'),
    premise: interaction.options.getString('premise'),
    startYear: interaction.options.getInteger('start_year'),
    startSeason: interaction.options.getString('start_season'),
    startDay: interaction.options.getInteger('start_day'),
    startDaypart: interaction.options.getString('start_daypart'),
    startingMessageUrl: startingMessageInput === null
      ? null
      : startingMessageUrl,
  };

  if (Object.values(changes).every((value) => value === null)) {
    await interaction.editReply({
      content: 'No changes were supplied. Run `/scene edit` again and fill in at least one field.',
    });

    return;
  }

  const editedScene = await editSceneById({
    sceneId: resolution.scene.id,
    guildId: interaction.guildId,
    ...changes,
  });

  if (!editedScene) {
    await interaction.editReply({
      content: 'The selected incident file could not be found.',
    });

    return;
  }

  const archiveResult = await refreshArchiveAfterChange(
    editedScene
  );

  const confirmationLines = [
    `**Incident File #${editedScene.id} has been updated.**`,
    '',
    `**Title:** ${editedScene.title}`,
    `**Location:** ${editedScene.location}`,
    `**Characters:** ${editedScene.characters}`,
    `**Starting date:** ${formatSceneDate(editedScene)}`,
  ];

  if (editedScene.starting_message_url) {
    confirmationLines.push(
      `**Scene begins here:** ${editedScene.starting_message_url}`
    );
  }

  confirmationLines.push(
    '',
    archiveResult
  );

  await interaction.editReply({
    content: confirmationLines.join('\n'),
  });
}

async function handleClose(interaction) {
  const channel = interaction.channel;

  if (!isUsableThread(interaction, channel)) {
    await interaction.reply({
      content: 'Please use `/scene close` inside the RP thread containing the scene.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  const resolution = await resolveSceneForManagement(
    channel.id,
    interaction.guildId,
    interaction.options.getInteger('file_number')
  );

  if (!resolution.scene) {
    await interaction.editReply({
      content: resolution.message,
    });

    return;
  }

  if (resolution.scene.status === 'completed') {
    await interaction.editReply({
      content: `Incident File #${resolution.scene.id} has already been completed.`,
    });

    return;
  }

  const completedScene = await closeSceneById({
    sceneId: resolution.scene.id,
    guildId: interaction.guildId,
    finalSummary: interaction.options.getString(
      'final_summary',
      true
    ),
    endYear: interaction.options.getInteger(
      'end_year',
      true
    ),
    endSeason: interaction.options.getString(
      'end_season',
      true
    ),
    endDay: interaction.options.getInteger(
      'end_day',
      true
    ),
    endDaypart: interaction.options.getString(
      'end_daypart',
      true
    ),
  });

  if (!completedScene) {
    await interaction.editReply({
      content: 'The selected incident file could not be found.',
    });

    return;
  }

  const archiveResult = await refreshArchiveAfterChange(
    completedScene
  );

  await interaction.editReply({
    content: [
      `**Incident File #${completedScene.id} has been closed.**`,
      '',
      `**Title:** ${completedScene.title}`,
      `**Status:** ${capitalize(completedScene.status)}`,
      `**Ending date:** ${formatEndingDate(completedScene)}`,
      '',
      '**Final Summary**',
      completedScene.final_summary,
      '',
      archiveResult,
      '',
      '*The record has been filed. The timeline remains somebody else’s problem.*',
    ].join('\n'),
  });
}

async function handlePublish(interaction) {
  const channel = interaction.channel;

  if (!isUsableThread(interaction, channel)) {
    await interaction.reply({
      content: 'Please use `/scene publish` inside the RP thread containing the incident file.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  const resolution = await resolveSceneForManagement(
    channel.id,
    interaction.guildId,
    interaction.options.getInteger('file_number')
  );

  if (!resolution.scene) {
    await interaction.editReply({
      content: resolution.message,
    });

    return;
  }

  const scene = resolution.scene;

  if (
    scene.archive_channel_id
    && scene.archive_message_id
  ) {
    try {
      const updatedArchiveMessage = await updateSceneArchive(
        client,
        scene
      );

      await interaction.editReply({
        content: [
          `**Incident File #${scene.id} has been refreshed.**`,
          '',
          `**Public record:** ${updatedArchiveMessage.url}`,
          '',
          'The existing archive card was updated with the latest saved information.',
        ].join('\n'),
      });

      return;
    } catch (error) {
      console.error(
        'The existing archive card could not be refreshed. Attempting a replacement:',
        error
      );
    }
  }

  const archiveMessage = await publishAndAttach(
    scene
  );

  await interaction.editReply({
    content: [
      `**Incident File #${scene.id} has been published.**`,
      '',
      `**Status:** ${capitalize(scene.status)}`,
      `**Public record:** ${archiveMessage.url}`,
      '',
      'The archive card has been attached to this specific incident file.',
    ].join('\n'),
  });
}

async function handleDeleteInThread(interaction) {
  const channel = interaction.channel;

  if (!isUsableThread(interaction, channel)) {
    await interaction.reply({
      content: 'Please use `/scene delete` inside the RP thread containing the file you want to remove.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  const confirmation = interaction.options.getString(
    'confirmation',
    true
  );

  if (!isDeleteConfirmationValid(confirmation)) {
    await interaction.reply({
      content: 'Deletion cancelled. The confirmation field must contain the word `DELETE`.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  const resolution = await resolveSceneForManagement(
    channel.id,
    interaction.guildId,
    interaction.options.getInteger('file_number')
  );

  if (!resolution.scene) {
    await interaction.editReply({
      content: resolution.message,
    });

    return;
  }

  await deleteSelectedScene(
    interaction,
    resolution.scene
  );
}

async function handleDeleteByNumber(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: 'Please use `/scene delete-file` inside the Discord server.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  const confirmation = interaction.options.getString(
    'confirmation',
    true
  );

  if (!isDeleteConfirmationValid(confirmation)) {
    await interaction.reply({
      content: 'Deletion cancelled. The confirmation field must contain the word `DELETE`.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  const fileNumber = interaction.options.getInteger(
    'file_number',
    true
  );

  const savedScene = await getSceneById(
    fileNumber,
    interaction.guildId
  );

  if (!savedScene) {
    await interaction.editReply({
      content: `Incident File #${fileNumber} could not be found in this server.`,
    });

    return;
  }

  await deleteSelectedScene(
    interaction,
    savedScene
  );
}

async function handleList(interaction) {
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
    const sceneUrl = getSceneUrl(scene);

    sceneListEmbed.addFields({
      name: `#${scene.id}: ${truncate(scene.title, 80)}`,
      value: [
        `**Date:** ${formatSceneDate(scene)}`,
        `**Status:** ${capitalize(scene.status)}`,
        `**Location:** ${truncate(scene.location, 80)}`,
        `**Characters:** ${truncate(scene.characters, 180)}`,
        `[Open scene](${sceneUrl})`,
      ].join('\n'),
    });
  }

  await interaction.editReply({
    embeds: [
      sceneListEmbed,
    ],
  });
}

async function resolveSceneForManagement(
  threadId,
  guildId,
  fileNumber
) {
  const scenes = await getScenesByThreadId(
    threadId
  );

  if (scenes.length === 0) {
    return {
      scene: null,
      message: 'This thread does not have a scene record yet.',
    };
  }

  if (fileNumber !== null) {
    const selectedScene = findSceneByNumber(
      scenes,
      fileNumber,
      guildId
    );

    if (!selectedScene) {
      return {
        scene: null,
        message: `Incident File #${fileNumber} is not attached to this thread.`,
      };
    }

    return {
      scene: selectedScene,
      message: null,
    };
  }

  if (scenes.length > 1) {
    return {
      scene: null,
      message: buildFileNumberRequiredMessage(
        scenes
      ),
    };
  }

  return {
    scene: scenes[0],
    message: null,
  };
}

function findSceneByNumber(
  scenes,
  fileNumber,
  guildId
) {
  return scenes.find((scene) => (
    String(scene.id) === String(fileNumber)
    && String(scene.guild_id) === String(guildId)
  )) || null;
}

function buildFileNumberRequiredMessage(scenes) {
  const lines = scenes
    .slice(0, 20)
    .map((scene) => (
      `• **#${scene.id}** — ${truncate(scene.title, 80)} (${capitalize(scene.status)})`
    ));

  if (scenes.length > 20) {
    lines.push(
      `• …and ${scenes.length - 20} more files`
    );
  }

  return [
    `This thread contains ${scenes.length} incident files, so the bot will not guess which one you mean.`,
    '',
    ...lines,
    '',
    'Run the command again and enter the correct `file_number`.',
  ].join('\n');
}

function buildThreadSceneListEmbed(scenes) {
  const embed = new EmbedBuilder()
    .setTitle(
      `This Thread Contains ${scenes.length} Incident Files`
    )
    .setDescription(
      'Use `/scene view file_number:` to open one full record. Moderator commands also require the correct file number for this thread.'
    )
    .setFooter({
      text: 'The Rhyolite Record • Reused Thread',
    });

  for (const scene of scenes.slice(0, 20)) {
    embed.addFields({
      name: `#${scene.id}: ${truncate(scene.title, 80)}`,
      value: [
        `**Date:** ${formatSceneDate(scene)}`,
        `**Status:** ${capitalize(scene.status)}`,
        `**Characters:** ${truncate(scene.characters, 180)}`,
        `[Open this scene](${getSceneUrl(scene)})`,
      ].join('\n'),
    });
  }

  if (scenes.length > 20) {
    embed.setDescription(
      `${embed.data.description}\n\nOnly the first 20 files are shown here.`
    );
  }

  return embed;
}

function buildSceneEmbed(scene) {
  const descriptionLines = [
    '**Premise**',
    scene.premise,
  ];

  if (
    scene.status === 'completed'
    && scene.final_summary
  ) {
    descriptionLines.push(
      '',
      '**Final Summary**',
      scene.final_summary
    );
  }

  const sceneUrl = getSceneUrl(scene);

  const sceneEmbed = new EmbedBuilder()
    .setTitle(
      `Incident File #${scene.id}: ${scene.title}`
    )
    .setURL(sceneUrl)
    .setDescription(
      descriptionLines.join('\n')
    )
    .addFields(
      {
        name: 'Location',
        value: scene.location,
      },
      {
        name: 'Characters',
        value: scene.characters,
      },
      {
        name: 'Starting Date',
        value: formatSceneDate(scene),
      },
      {
        name: 'Status',
        value: capitalize(scene.status),
      },
      {
        name: scene.starting_message_url
          ? 'Scene Starting Point'
          : 'Recorded Thread',
        value: `[Open the scene](${sceneUrl})`,
      }
    )
    .setFooter({
      text: 'The Rhyolite Record',
    });

  if (
    scene.status === 'completed'
    && scene.end_year
  ) {
    sceneEmbed.addFields({
      name: 'Ending Date',
      value: formatEndingDate(scene),
    });
  }

  sceneEmbed.setTimestamp(
    new Date(
      scene.status === 'completed'
        ? scene.updated_at
        : scene.created_at
    )
  );

  return sceneEmbed;
}

async function publishAndAttach(scene) {
  const archiveMessage = await publishSceneArchive(
    client,
    scene
  );

  await attachArchiveMessage({
    channelId: archiveMessage.channelId,
    messageId: archiveMessage.id,
    sceneId: scene.id,
  });

  return archiveMessage;
}

async function refreshArchiveAfterChange(scene) {
  if (
    !scene.archive_channel_id
    || !scene.archive_message_id
  ) {
    return `This file does not have a public archive card yet. Use \`/scene publish file_number: ${scene.id}\` to create one.`;
  }

  try {
    const updatedMessage = await updateSceneArchive(
      client,
      scene
    );

    return `**Public record updated:** ${updatedMessage.url}`;
  } catch (error) {
    console.error(
      `Incident File #${scene.id} changed, but its archive card could not be refreshed:`,
      error
    );

    return `The database record was updated, but its public archive card could not be refreshed. Use \`/scene publish file_number: ${scene.id}\` to repair it.`;
  }
}

async function deleteSelectedScene(
  interaction,
  scene
) {
  let archiveResult;

  try {
    archiveResult = await deleteArchiveCard(
      scene
    );
  } catch (error) {
    console.error(
      'Could not delete public archive card:',
      error
    );

    await interaction.editReply({
      content: [
        `Deletion of Incident File #${scene.id} was stopped because its public archive card could not be removed.`,
        '',
        'The PostgreSQL record has not been deleted. Please ask a moderator to check the Railway logs.',
      ].join('\n'),
    });

    return;
  }

  const deletedScene = await deleteSceneById(
    scene.id,
    scene.guild_id
  );

  if (!deletedScene) {
    await interaction.editReply({
      content: [
        'The public archive card was handled, but no matching PostgreSQL record could be deleted.',
        '',
        'Please ask a moderator to check the Railway logs.',
      ].join('\n'),
    });

    return;
  }

  await interaction.editReply({
    content: [
      `**Incident File #${deletedScene.id} has been permanently deleted.**`,
      '',
      `**Title:** ${deletedScene.title}`,
      archiveResult,
      `**Original thread:** ${deletedScene.thread_url}`,
      '',
      'The original Discord thread was not deleted.',
      '',
      '*The filing cabinet denies ever having contained such a document.*',
    ].join('\n'),
  });
}

async function deleteArchiveCard(scene) {
  if (
    !scene.archive_channel_id
    || !scene.archive_message_id
  ) {
    return 'No public archive card was attached.';
  }

  try {
    const archiveChannel = await client.channels.fetch(
      scene.archive_channel_id
    );

    if (
      !archiveChannel
      || !archiveChannel.isTextBased()
      || !archiveChannel.messages
    ) {
      throw new Error(
        'The saved archive channel could not be opened.'
      );
    }

    const archiveMessage = await archiveChannel.messages.fetch(
      scene.archive_message_id
    );

    await archiveMessage.delete();

    return 'The public archive card was deleted.';
  } catch (error) {
    if (isMissingDiscordResource(error)) {
      return 'The public archive card was already missing.';
    }

    throw error;
  }
}

function validateStartingMessageUrl(
  input,
  guildId,
  threadId
) {
  const trimmedInput = input.trim();

  let parsedUrl;

  try {
    parsedUrl = new URL(trimmedInput);
  } catch {
    return {
      valid: false,
      message: 'The starting-message field must contain a complete Discord message link copied with **Copy Message Link**.',
    };
  }

  const allowedHosts = new Set([
    'discord.com',
    'ptb.discord.com',
    'canary.discord.com',
    'discordapp.com',
    'ptb.discordapp.com',
    'canary.discordapp.com',
  ]);

  const pathParts = parsedUrl.pathname
    .split('/')
    .filter(Boolean);

  if (
    parsedUrl.protocol !== 'https:'
    || !allowedHosts.has(parsedUrl.hostname)
    || pathParts[0] !== 'channels'
    || pathParts.length < 4
    || !/^\d+$/.test(pathParts[1])
    || !/^\d+$/.test(pathParts[2])
    || !/^\d+$/.test(pathParts[3])
  ) {
    return {
      valid: false,
      message: 'That does not look like a valid Discord message link. Right-click the first message of the scene and choose **Copy Message Link**.',
    };
  }

  if (pathParts[1] !== String(guildId)) {
    return {
      valid: false,
      message: 'That message link belongs to a different Discord server.',
    };
  }

  if (pathParts[2] !== String(threadId)) {
    return {
      valid: false,
      message: 'That message link belongs to a different channel or thread. Copy the first message from the current RP thread.',
    };
  }

  return {
    valid: true,
    url: `https://discord.com/channels/${pathParts[1]}/${pathParts[2]}/${pathParts[3]}`,
  };
}

function getSceneUrl(scene) {
  return scene.starting_message_url
    || scene.thread_url;
}

function isUsableThread(
  interaction,
  channel
) {
  return Boolean(
    interaction.inGuild()
    && channel
    && channel.isThread()
  );
}

function isDeleteConfirmationValid(value) {
  return value.trim().toUpperCase() === 'DELETE';
}

function isMissingDiscordResource(error) {
  const errorCode = Number(
    error?.code
  );

  return (
    errorCode === 10008
    || errorCode === 10003
  );
}

function formatSceneDate(scene) {
  return `${capitalize(scene.start_season)} ${scene.start_day}, Year ${scene.start_year} — ${capitalize(scene.start_daypart)}`;
}

function formatEndingDate(scene) {
  return `${capitalize(scene.end_season)} ${scene.end_day}, Year ${scene.end_year} — ${capitalize(scene.end_daypart)}`;
}

function capitalize(word) {
  if (!word) {
    return 'Unspecified';
  }

  return word.charAt(0).toUpperCase()
    + word.slice(1);
}

function truncate(text, maximumLength) {
  if (text.length <= maximumLength) {
    return text;
  }

  return `${text.slice(0, maximumLength - 3)}...`;
}

client.on(Events.Error, (error) => {
  console.error('Discord client error:', error);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM from Railway. Disconnecting from Discord.');
  client.destroy();
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
