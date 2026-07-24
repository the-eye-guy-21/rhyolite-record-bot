const {
  EmbedBuilder,
} = require('discord.js');

async function publishPlotArchive(
  client,
  plotPoint
) {
  const archiveChannel = await getArchiveChannel(
    client,
    process.env.ARCHIVE_CHANNEL_ID
  );

  const archiveEmbed = buildPlotArchiveEmbed(
    plotPoint
  );

  const archiveMessage = await archiveChannel.send({
    embeds: [
      archiveEmbed,
    ],
  });

  return archiveMessage;
}

async function updatePlotArchive(
  client,
  plotPoint
) {
  if (
    !plotPoint.archive_channel_id
    || !plotPoint.archive_message_id
  ) {
    throw new Error(
      'This Chronicle Entry does not have a saved archive message.'
    );
  }

  const archiveChannel = await getArchiveChannel(
    client,
    plotPoint.archive_channel_id
  );

  const archiveMessage =
    await archiveChannel.messages.fetch(
      plotPoint.archive_message_id
    );

  const archiveEmbed = buildPlotArchiveEmbed(
    plotPoint
  );

  const updatedMessage = await archiveMessage.edit({
    embeds: [
      archiveEmbed,
    ],
  });

  return updatedMessage;
}

async function getArchiveChannel(
  client,
  channelId
) {
  if (!channelId) {
    throw new Error(
      'Missing the ARCHIVE_CHANNEL_ID environment variable.'
    );
  }

  const archiveChannel = await client.channels.fetch(
    channelId
  );

  if (
    !archiveChannel
    || !archiveChannel.isSendable()
    || !archiveChannel.isTextBased()
  ) {
    throw new Error(
      'The archive channel could not be found or cannot receive messages.'
    );
  }

  return archiveChannel;
}

function buildPlotArchiveEmbed(
  plotPoint
) {
  const title =
    `Chronicle Entry #${plotPoint.id}: ${plotPoint.title}`;

  const archiveEmbed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(plotPoint.summary)
    .addFields(
      {
        name: 'Entry Type',
        value: formatEntryType(
          plotPoint.entry_type
        ),
      },
      {
        name: 'Date',
        value: formatPlotDate(
          plotPoint.event_year,
          plotPoint.event_season,
          plotPoint.event_day,
          plotPoint.event_daypart
        ),
      }
    )
    .setFooter({
      text: 'The Rhyolite Record • Chronicle Entry',
    })
    .setTimestamp(
      new Date(plotPoint.created_at)
    );

  if (plotPoint.location) {
    archiveEmbed.addFields({
      name: 'Location',
      value: plotPoint.location,
    });
  }

  if (plotPoint.people) {
    archiveEmbed.addFields({
      name: 'People Involved',
      value: plotPoint.people,
    });
  }

  if (plotPoint.source_url) {
    archiveEmbed
      .setURL(plotPoint.source_url)
      .addFields({
        name: 'Source',
        value: `[Open the related message or thread](${plotPoint.source_url})`,
      });
  }

  return archiveEmbed;
}

function formatPlotDate(
  year,
  season,
  day,
  daypart
) {
  return `${capitalize(season)} ${day}, Year ${year} — ${capitalize(daypart)}`;
}

function formatEntryType(entryType) {
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
  buildPlotArchiveEmbed,
  publishPlotArchive,
  updatePlotArchive,
};
