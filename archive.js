const {
  EmbedBuilder,
} = require('discord.js');

async function publishSceneArchive(client, scene) {
  const archiveChannelId = process.env.ARCHIVE_CHANNEL_ID;

  if (!archiveChannelId) {
    throw new Error(
      'Missing the ARCHIVE_CHANNEL_ID environment variable.'
    );
  }

  const archiveChannel = await client.channels.fetch(
    archiveChannelId
  );

  if (!archiveChannel || !archiveChannel.isSendable()) {
    throw new Error(
      'The archive channel could not be found or cannot receive messages.'
    );
  }

  const archiveEmbed = buildSceneArchiveEmbed(scene);

  const archiveMessage = await archiveChannel.send({
    embeds: [
      archiveEmbed,
    ],
  });

  return archiveMessage;
}

function buildSceneArchiveEmbed(scene) {
  const archiveEmbed = new EmbedBuilder()
    .setTitle(
      `Incident File #${scene.id}: ${scene.title}`
    )
    .setURL(scene.thread_url)
    .setDescription(scene.premise)
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
        value: formatSceneDate(
          scene.start_year,
          scene.start_season,
          scene.start_day,
          scene.start_daypart
        ),
      },
      {
        name: 'Status',
        value: capitalize(scene.status),
      },
      {
        name: 'Original Scene',
        value: `[Open the RP thread](${scene.thread_url})`,
      }
    )
    .setFooter({
      text: 'The Rhyolite Record • Ongoing Scene',
    })
    .setTimestamp(
      new Date(scene.created_at)
    );

  return archiveEmbed;
}

function formatSceneDate(
  year,
  season,
  day,
  daypart
) {
  return `${capitalize(season)} ${day}, Year ${year} — ${capitalize(daypart)}`;
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

module.exports = {
  buildSceneArchiveEmbed,
  publishSceneArchive,
};
