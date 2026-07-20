const {
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');

const {
  getCalendarState,
  setCalendarState,
} = require('./database');

async function handleCalendarCommand(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: 'Please use calendar commands inside the Discord server.',
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'set') {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    const currentYear = interaction.options.getInteger(
      'year',
      true
    );

    const currentSeason = interaction.options.getString(
      'season',
      true
    );

    const currentDay = interaction.options.getInteger(
      'day',
      true
    );

    const currentDaypart = interaction.options.getString(
      'daypart',
      true
    );

    try {
      const savedCalendar = await setCalendarState({
        guildId: interaction.guildId,
        currentYear: currentYear,
        currentSeason: currentSeason,
        currentDay: currentDay,
        currentDaypart: currentDaypart,
        updatedByUserId: interaction.user.id,
      });

      await interaction.editReply({
        content: [
          '**The current Rhyolite date has been updated.**',
          '',
          `**Date:** ${capitalize(savedCalendar.current_season)} ${savedCalendar.current_day}, Year ${savedCalendar.current_year}`,
          `**Daypart:** ${capitalize(savedCalendar.current_daypart)}`,
          '',
          '*The calendar has been corrected. Please disregard any contradictory clocks, watches, or celestial bodies.*',
        ].join('\n'),
      });
    } catch (error) {
      console.error('Could not set calendar date:', error);

      await interaction.editReply({
        content: 'The current date could not be saved. Please ask a moderator to check the Railway logs.',
      });
    }

    return;
  }

  if (subcommand === 'view') {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    try {
      const savedCalendar = await getCalendarState(
        interaction.guildId
      );

      if (!savedCalendar) {
        await interaction.editReply({
          content: 'The current Rhyolite date has not been set yet. Use `/calendar set` first.',
        });

        return;
      }

      const calendarEmbed = new EmbedBuilder()
        .setTitle('Current Rhyolite Date')
        .setDescription(
          `**${capitalize(savedCalendar.current_season)} ${savedCalendar.current_day}, Year ${savedCalendar.current_year}**`
        )
        .addFields({
          name: 'Daypart',
          value: capitalize(savedCalendar.current_daypart),
        })
        .setFooter({
          text: 'The Rhyolite Record',
        })
        .setTimestamp(
          new Date(savedCalendar.updated_at)
        );

      await interaction.editReply({
        embeds: [
          calendarEmbed,
        ],
      });
    } catch (error) {
      console.error('Could not retrieve calendar date:', error);

      await interaction.editReply({
        content: 'The current date could not be opened. Please ask a moderator to check the Railway logs.',
      });
    }
  }
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

module.exports = {
  handleCalendarCommand,
};
