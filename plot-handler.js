const {
  MessageFlags,
} = require('discord.js');

const {
  attachPlotArchiveMessage,
  createPlotPoint,
} = require('./database');

const {
  publishPlotArchive,
} = require('./plot-archive');

const {
  requireModerator,
} = require('./permissions');

async function handlePlotCommand(
  interaction,
  client
) {
  const allowed = await requireModerator(
    interaction
  );

  if (!allowed) {
    return;
  }

  if (!interaction.inGuild()) {
    await interaction.reply({
      content: 'Please use `/plot` inside the Discord server.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  const subcommand =
    interaction.options.getSubcommand();

  if (subcommand !== 'register') {
    await interaction.reply({
      content: 'That Chronicle Entry command is not available.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  const sourceLinkInput =
    interaction.options.getString(
      'source_link'
    );

  let sourceUrl = null;

  if (sourceLinkInput !== null) {
    const validation =
      validateDiscordSourceUrl(
        sourceLinkInput,
        interaction.guildId
      );

    if (!validation.valid) {
      await interaction.editReply({
        content: validation.message,
      });

      return;
    }

    sourceUrl = validation.url;
  }

  let savedPlotPoint;

  try {
    savedPlotPoint = await createPlotPoint({
      guildId: interaction.guildId,

      entryType:
        interaction.options.getString(
          'type',
          true
        ),

      title:
        interaction.options.getString(
          'title',
          true
        ),

      summary:
        interaction.options.getString(
          'summary',
          true
        ),

      eventYear:
        interaction.options.getInteger(
          'event_year',
          true
        ),

      eventSeason:
        interaction.options.getString(
          'event_season',
          true
        ),

      eventDay:
        interaction.options.getInteger(
          'event_day',
          true
        ),

      eventDaypart:
        interaction.options.getString(
          'event_daypart',
          true
        ),

      people:
        interaction.options.getString(
          'people'
        ),

      location:
        interaction.options.getString(
          'location'
        ),

      sourceUrl: sourceUrl,

      createdByUserId:
        interaction.user.id,
    });
  } catch (error) {
    console.error(
      'Could not save Chronicle Entry:',
      error
    );

    await interaction.editReply({
      content: [
        'The Chronicle Entry could not be saved.',
        '',
        'Please ask a moderator to check the Railway logs.',
      ].join('\n'),
    });

    return;
  }

  try {
    const archiveMessage =
      await publishPlotArchive(
        client,
        savedPlotPoint
      );

    const attachedPlotPoint =
      await attachPlotArchiveMessage({
        channelId:
          archiveMessage.channelId,

        messageId:
          archiveMessage.id,

        plotPointId:
          savedPlotPoint.id,

        guildId:
          interaction.guildId,
      });

    if (!attachedPlotPoint) {
      throw new Error(
        'The archive message was posted, but its ID could not be attached to the Chronicle Entry.'
      );
    }

    const confirmationLines = [
      `**Chronicle Entry #${savedPlotPoint.id} has been recorded.**`,
      '',
      `**Type:** ${formatEntryType(savedPlotPoint.entry_type)}`,
      `**Title:** ${savedPlotPoint.title}`,
      `**Date:** ${formatPlotDate(savedPlotPoint)}`,
      `**Public record:** ${archiveMessage.url}`,
    ];

    if (savedPlotPoint.location) {
      confirmationLines.push(
        `**Location:** ${savedPlotPoint.location}`
      );
    }

    if (savedPlotPoint.people) {
      confirmationLines.push(
        `**People involved:** ${savedPlotPoint.people}`
      );
    }

    if (savedPlotPoint.source_url) {
      confirmationLines.push(
        `**Source:** ${savedPlotPoint.source_url}`
      );
    }

    confirmationLines.push(
      '',
      '*The town chronicle has been amended. Reality may file an objection in writing.*'
    );

    await interaction.editReply({
      content: confirmationLines.join('\n'),
    });
  } catch (error) {
    console.error(
      'Chronicle Entry saved, but archive publication failed:',
      error
    );

    await interaction.editReply({
      content: [
        `**Chronicle Entry #${savedPlotPoint.id} was saved successfully.**`,
        '',
        'Its public archive card could not be completed.',
        'Do not register the entry again, because the PostgreSQL record already exists.',
        '',
        'Please ask a moderator to check the Railway logs.',
      ].join('\n'),
    });
  }
}

function validateDiscordSourceUrl(
  input,
  guildId
) {
  const trimmedInput = input.trim();

  let parsedUrl;

  try {
    parsedUrl = new URL(
      trimmedInput
    );
  } catch {
    return {
      valid: false,
      message: [
        'The source field must contain a complete Discord link.',
        '',
        'Right-click the related message and choose **Copy Message Link**, or copy the related thread link.',
      ].join('\n'),
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

  const pathParts =
    parsedUrl.pathname
      .split('/')
      .filter(Boolean);

  const isChannelOrMessageLink =
    parsedUrl.protocol === 'https:'
    && allowedHosts.has(
      parsedUrl.hostname
    )
    && pathParts[0] === 'channels'
    && (
      pathParts.length === 3
      || pathParts.length === 4
    )
    && /^\d+$/.test(
      pathParts[1]
    )
    && /^\d+$/.test(
      pathParts[2]
    )
    && (
      pathParts.length === 3
      || /^\d+$/.test(
        pathParts[3]
      )
    );

  if (!isChannelOrMessageLink) {
    return {
      valid: false,
      message: [
        'That does not look like a valid Discord message or thread link.',
        '',
        'Right-click the related message and choose **Copy Message Link**, or copy the related thread link.',
      ].join('\n'),
    };
  }

  if (
    pathParts[1]
    !== String(guildId)
  ) {
    return {
      valid: false,
      message: 'That source link belongs to a different Discord server.',
    };
  }

  const normalizedParts = [
    'https://discord.com/channels',
    pathParts[1],
    pathParts[2],
  ];

  if (pathParts[3]) {
    normalizedParts.push(
      pathParts[3]
    );
  }

  return {
    valid: true,
    url: normalizedParts.join('/'),
  };
}

function formatPlotDate(
  plotPoint
) {
  return `${capitalize(plotPoint.event_season)} ${plotPoint.event_day}, Year ${plotPoint.event_year} — ${capitalize(plotPoint.event_daypart)}`;
}

function formatEntryType(
  entryType
) {
  const entryTypeNames = {
    event: 'Event',
    arrival: 'Arrival',
    departure: 'Departure',
    discovery: 'Discovery',
    lore: 'Lore',
    town_change: 'Town Change',
    other: 'Other',
  };

  return entryTypeNames[entryType]
    || 'Other';
}

function capitalize(word) {
  if (!word) {
    return 'Unspecified';
  }

  return word.charAt(0).toUpperCase()
    + word.slice(1);
}

module.exports = {
  handlePlotCommand,
};
