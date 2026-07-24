const {
  SlashCommandBuilder,
} = require('discord.js');

const plotCommand = new SlashCommandBuilder()
  .setName('plot')
  .setDescription('Create and manage Rhyolite Chronicle Entries.')

  .addSubcommand((subcommand) =>
    subcommand
      .setName('register')
      .setDescription('Register an event or plot point in the town chronicle.')

      .addStringOption((option) =>
        option
          .setName('type')
          .setDescription('What kind of Chronicle Entry is this?')
          .addChoices(
            {
              name: 'Event',
              value: 'event',
            },
            {
              name: 'Arrival',
              value: 'arrival',
            },
            {
              name: 'Departure',
              value: 'departure',
            },
            {
              name: 'Discovery',
              value: 'discovery',
            },
            {
              name: 'Lore',
              value: 'lore',
            },
            {
              name: 'Town Change',
              value: 'town_change',
            },
            {
              name: 'Other',
              value: 'other',
            }
          )
          .setRequired(true)
      )

      .addStringOption((option) =>
        option
          .setName('title')
          .setDescription('A short title for the Chronicle Entry.')
          .setMaxLength(100)
          .setRequired(true)
      )

      .addStringOption((option) =>
        option
          .setName('summary')
          .setDescription('Describe what happened and why it matters.')
          .setMaxLength(2000)
          .setRequired(true)
      )

      .addIntegerOption((option) =>
        option
          .setName('event_year')
          .setDescription('The in-universe year when this happened.')
          .setMinValue(1)
          .setMaxValue(999)
          .setRequired(true)
      )

      .addStringOption((option) =>
        option
          .setName('event_season')
          .setDescription('The season when this happened.')
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
          .setName('event_day')
          .setDescription('The day of the season, from 1 to 28.')
          .setMinValue(1)
          .setMaxValue(28)
          .setRequired(true)
      )

      .addStringOption((option) =>
        option
          .setName('event_daypart')
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
          .setName('people')
          .setDescription('Optional people or characters connected to the entry.')
          .setMaxLength(1000)
      )

      .addStringOption((option) =>
        option
          .setName('location')
          .setDescription('Optional location connected to the entry.')
          .setMaxLength(100)
      )

      .addStringOption((option) =>
        option
          .setName('source_link')
          .setDescription('Optional Discord message or thread link.')
          .setMaxLength(500)
      )
  );

module.exports = {
  plotCommand,
};
