const {
  SlashCommandBuilder,
} = require('discord.js');

const sceneCommand = new SlashCommandBuilder()
  .setName('scene')
  .setDescription('Create and manage Rhyolite scene records.')

  .addSubcommand((subcommand) =>
    subcommand
      .setName('register')
      .setDescription('Register the current thread as an RP scene.')

      .addStringOption((option) =>
        option
          .setName('title')
          .setDescription('The title of the scene.')
          .setMaxLength(100)
          .setRequired(true)
      )

      .addStringOption((option) =>
        option
          .setName('location')
          .setDescription('Where the scene takes place.')
          .setMaxLength(100)
          .setRequired(true)
      )

      .addStringOption((option) =>
        option
          .setName('characters')
          .setDescription('Characters involved, separated by commas.')
          .setMaxLength(1000)
          .setRequired(true)
      )

      .addStringOption((option) =>
        option
          .setName('premise')
          .setDescription('A brief description of what begins the scene.')
          .setMaxLength(1500)
          .setRequired(true)
      )

      .addIntegerOption((option) =>
        option
          .setName('start_year')
          .setDescription('The in-universe year.')
          .setMinValue(1)
          .setMaxValue(999)
          .setRequired(true)
      )

      .addStringOption((option) =>
        option
          .setName('start_season')
          .setDescription('The season when the scene begins.')
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
          .setName('start_day')
          .setDescription('The day of the season, from 1 to 28.')
          .setMinValue(1)
          .setMaxValue(28)
          .setRequired(true)
      )

      .addStringOption((option) =>
        option
          .setName('start_daypart')
          .setDescription('The general time of day.')
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
      .setDescription('View the scene record for the current thread.')
  )

  .addSubcommand((subcommand) =>
    subcommand
      .setName('close')
      .setDescription('Complete the scene record for the current thread.')

      .addStringOption((option) =>
        option
          .setName('final_summary')
          .setDescription('A summary of what happened in the scene.')
          .setMaxLength(2000)
          .setRequired(true)
      )

      .addIntegerOption((option) =>
        option
          .setName('end_year')
          .setDescription('The in-universe year when the scene ends.')
          .setMinValue(1)
          .setMaxValue(999)
          .setRequired(true)
      )

      .addStringOption((option) =>
        option
          .setName('end_season')
          .setDescription('The season when the scene ends.')
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
          .setName('end_day')
          .setDescription('The ending day of the season, from 1 to 28.')
          .setMinValue(1)
          .setMaxValue(28)
          .setRequired(true)
      )

      .addStringOption((option) =>
        option
          .setName('end_daypart')
          .setDescription('The general time of day when the scene ends.')
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
      .setName('list')
      .setDescription('List the 10 latest scene records.')
  )

  .addSubcommand((subcommand) =>
    subcommand
      .setName('publish')
      .setDescription('Publish or repair the public archive card for this scene.')
  );

module.exports = {
  sceneCommand,
};
