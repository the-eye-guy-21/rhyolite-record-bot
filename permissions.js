const {
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');

function isModerator(interaction) {
  if (!interaction.inGuild()) {
    return false;
  }

  if (interaction.user.id === interaction.guild.ownerId) {
    return true;
  }

  if (
    interaction.memberPermissions
    && interaction.memberPermissions.has(
      PermissionFlagsBits.Administrator
    )
  ) {
    return true;
  }

  const moderatorRoleId =
    process.env.MODERATOR_ROLE_ID;

  if (!moderatorRoleId) {
    return false;
  }

  const member = interaction.member;

  if (
    !member
    || !member.roles
    || !member.roles.cache
  ) {
    return false;
  }

  return member.roles.cache.has(
    moderatorRoleId
  );
}

async function requireModerator(interaction) {
  const allowed = isModerator(interaction);

  if (allowed) {
    return true;
  }

  await interaction.reply({
    content: 'You do not have permission to manage this scene record.',
    flags: MessageFlags.Ephemeral,
  });

  return false;
}

module.exports = {
  isModerator,
  requireModerator,
};
