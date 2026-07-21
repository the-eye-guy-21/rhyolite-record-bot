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
      .setName('register-additional')
      .setDescription('Register another scene inside a reused RP thread.')

      .addStringOption((option) =>
        option
          .setName('title')
          .setDescription('The title of the additional scene.')
          .setMaxLength(100)
          .setRequired(true)
      )

      .addStringOption((option) =>
        option
          .setName('location')
          .setDescription('Where the additional scene takes place.')
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
          .setDescription('A brief description of what begins this scene.')
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

      .addStringOption((option) =>
        option
          .setName('starting_message')
          .setDescription('Optional link to the first message of this scene.')
          .setMaxLength(500)
      )
  )

  .addSubcommand((subcommand) =>
    subcommand
      .setName('view')
      .setDescription('View scene records belonging to the current thread.')

      .addIntegerOption((option) =>
        option
          .setName('file_number')
          .setDescription('Optional incident-file number to view.')
          .setMinValue(1)
      )
  )

  .addSubcommand((subcommand) =>
    subcommand
      .setName('close')
      .setDescription('Complete a scene record in the current thread.')

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

      .addIntegerOption((option) =>
        option
          .setName('file_number')
          .setDescription('Required when this thread has multiple files.')
          .setMinValue(1)
      )
  )

  .addSubcommand((subcommand) =>
    subcommand
      .setName('edit')
      .setDescription('Correct information in a scene record.')

      .addIntegerOption((option) =>
        option
          .setName('file_number')
          .setDescription('Required when this thread has multiple files.')
          .setMinValue(1)
      )

      .addStringOption((option) =>
        option
          .setName('title')
          .setDescription('Replace the current scene title.')
          .setMaxLength(100)
      )

      .addStringOption((option) =>
        option
          .setName('location')
          .setDescription('Replace the current scene location.')
          .setMaxLength(100)
      )

      .addStringOption((option) =>
        option
          .setName('characters')
          .setDescription('Replace the current character list.')
          .setMaxLength(1000)
      )

      .addStringOption((option) =>
        option
          .setName('premise')
          .setDescription('Replace the current scene premise.')
          .setMaxLength(1500)
      )

      .addIntegerOption((option) =>
        option
          .setName('start_year')
          .setDescription('Replace the starting year.')
          .setMinValue(1)
          .setMaxValue(999)
      )

      .addStringOption((option) =>
        option
          .setName('start_season')
          .setDescription('Replace the starting season.')
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
      )

      .addIntegerOption((option) =>
        option
          .setName('start_day')
          .setDescription('Replace the starting day, from 1 to 28.')
          .setMinValue(1)
          .setMaxValue(28)
      )

      .addStringOption((option) =>
        option
          .setName('start_daypart')
          .setDescription('Replace the starting daypart.')
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
      )

      .addStringOption((option) =>
        option
          .setName('starting_message')
          .setDescription('Replace the link to the scene’s first message.')
          .setMaxLength(500)
      )
  )

  .addSubcommand((subcommand) =>
    subcommand
      .setName('delete')
      .setDescription('Permanently delete a file in the current thread.')

      .addStringOption((option) =>
        option
          .setName('confirmation')
          .setDescription('Type DELETE to confirm permanent deletion.')
          .setMinLength(6)
          .setMaxLength(6)
          .setRequired(true)
      )

      .addIntegerOption((option) =>
        option
          .setName('file_number')
          .setDescription('Required when this thread has multiple files.')
          .setMinValue(1)
      )
  )

  .addSubcommand((subcommand) =>
    subcommand
      .setName('delete-file')
      .setDescription('Permanently delete an incident file by its number.')

      .addIntegerOption((option) =>
        option
          .setName('file_number')
          .setDescription('The incident-file number to delete.')
          .setMinValue(1)
          .setRequired(true)
      )

      .addStringOption((option) =>
        option
          .setName('confirmation')
          .setDescription('Type DELETE to confirm permanent deletion.')
          .setMinLength(6)
          .setMaxLength(6)
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
      .setDescription('Publish or repair a public archive card.')

      .addIntegerOption((option) =>
        option
          .setName('file_number')
          .setDescription('Required when this thread has multiple files.')
          .setMinValue(1)
      )
  );

module.exports = {
  sceneCommand,
};
