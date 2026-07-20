const {
  SlashCommandBuilder,
} = require('discord.js');

const calendarCommand = new SlashCommandBuilder()
  .setName('calendar')
  .setDescription('View or change Rhyolite’s current date.')

  .addSubcommand((subcommand) =>
    subcommand
      .setName('set')
      .setDescription('Set the current in-universe date.')

      .addIntegerOption((option) =>
        option
          .setName('year')
          .setDescription('The current in-universe year.')
          .setMinValue(1)
          .setMaxValue(999)
          .setRequired(true)
      )

      .addStringOption((option) =>
        option
          .setName('season')
          .setDescription('The current season.')
          .addChoices(
            {
              name: 'Spring',
              value: 'spring',
            },
            {
              name: 'Summer',
              value: 'summer',
            },
            {
              name: 'Fall',
              value: 'fall',
            },
            {
              name: 'Winter',
              value: 'winter',
            }
          )
          .setRequired(true)
      )

      .addIntegerOption((option) =>
        option
          .setName('day')
          .setDescription('The current day of the season, from 1 to 28.')
          .setMinValue(1)
          .setMaxValue(28)
          .setRequired(true)
      )

      .addStringOption((option) =>
        option
          .setName('daypart')
          .setDescription('The current general time of day.')
          .addChoices(
            {
              name: 'Morning',
              value: 'morning',
            },
            {
              name: 'Midmorning',
              value: 'midmorning',
            },
            {
              name: 'Afternoon',
              value: 'afternoon',
            },
            {
              name: 'Evening',
              value: 'evening',
            },
            {
              name: 'Night',
              value: 'night',
            },
            {
              name: 'Unspecified',
              value: 'unspecified',
            }
          )
          .setRequired(true)
      )
  )

  .addSubcommand((subcommand) =>
    subcommand
      .setName('view')
      .setDescription('View the current in-universe date.')
  );

module.exports = {
  calendarCommand,
};
