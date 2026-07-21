const {
  EmbedBuilder,
} = require('discord.js');

async function publishSceneArchive(
  client,
  scene
) {
  const archiveChannel = await getArchiveChannel(
    client,
    process.env.ARCHIVE_CHANNEL_ID
  );

  const archiveEmbed = buildSceneArchiveEmbed(
    scene
  );

  const archiveMessage = await archiveChannel.send({
    embeds: [
      archiveEmbed,
    ],
  });

  return archiveMessage;
}

async function updateSceneArchive(
  client,
  scene
) {
  if (
    !scene.archive_channel_id
    || !scene.archive_message_id
  ) {
    throw new Error(
      'This scene does not have a saved archive message.'
    );
  }

  const archiveChannel = await getArchiveChannel(
    client,
    scene.archive_channel_id
  );

  const archiveMessage =
    await archiveChannel.messages.fetch(
      scene.archive_message_id
    );

  const archiveEmbed = buildSceneArchiveEmbed(
    scene
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

function buildSceneArchiveEmbed(scene) {
  const sceneUrl = getSceneUrl(
    scene
  );

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

  const archiveEmbed = new EmbedBuilder()
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
        name: scene.starting_message_url
          ? 'Scene Starting Point'
          : 'Original Scene',
        value: `[Open this scene](${sceneUrl})`,
      }
    );

  if (scene.starting_message_url) {
    archiveEmbed.addFields({
      name: 'Full Reused Thread',
      value: `[View the entire thread](${scene.thread_url})`,
    });
  }

  if (
    scene.status === 'completed'
    && scene.end_year
  ) {
    archiveEmbed.addFields({
      name: 'Ending Date',
      value: formatSceneDate(
        scene.end_year,
        scene.end_season,
        scene.end_day,
        scene.end_daypart
      ),
    });
  }

  if (scene.status === 'completed') {
    archiveEmbed
      .setFooter({
        text: 'The Rhyolite Record • Completed Scene',
      })
      .setTimestamp(
        new Date(scene.updated_at)
      );
  } else {
    archiveEmbed
      .setFooter({
        text: scene.starting_message_url
          ? 'The Rhyolite Record • Ongoing Scene • Reused Thread'
          : 'The Rhyolite Record • Ongoing Scene',
      })
      .setTimestamp(
        new Date(scene.created_at)
      );
  }

  return archiveEmbed;
}

function getSceneUrl(scene) {
  return scene.starting_message_url
    || scene.thread_url;
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
  if (!word) {
    return 'Unspecified';
  }

  return word.charAt(0).toUpperCase()
    + word.slice(1);
}

module.exports = {
  buildSceneArchiveEmbed,
  publishSceneArchive,
  updateSceneArchive,
};
