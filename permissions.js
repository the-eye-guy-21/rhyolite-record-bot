const {
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');

async function isModerator(interaction) {
  if (!interaction.inGuild()) {
    return false;
  }

  if (
    interaction.user.id
    === interaction.guild.ownerId
  ) {
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
    process.env.MODERATOR_ROLE_ID?.trim();

  if (!moderatorRoleId) {
    console.error(
      'MODERATOR_ROLE_ID is missing from Railway.'
    );

    return false;
  }

  const member = interaction.member;

  if (
    member
    && member.roles
    && member.roles.cache
    && member.roles.cache.has(
      moderatorRoleId
    )
  ) {
    return true;
  }

  if (
    member
    && Array.isArray(member.roles)
    && member.roles.includes(
      moderatorRoleId
    )
  ) {
    return true;
  }

  try {
    const fetchedMember =
      await interaction.guild.members.fetch(
        interaction.user.id
      );

    if (
      fetchedMember.roles.cache.has(
        moderatorRoleId
      )
    ) {
      return true;
    }
  } catch (error) {
    console.error(
      'Could not fetch the command user while checking moderator permissions:',
      error
    );
  }

  console.log(
    `Permission denied for user ${interaction.user.id}. Expected moderator role ${moderatorRoleId}.`
  );

  return false;
}

async function requireModerator(interaction) {
  const allowed = await isModerator(
    interaction
  );

  if (allowed) {
    return true;
  }

  await interaction.reply({
    content: [
      'You do not have permission to manage this scene record.',
      '',
      'A server administrator should confirm that your moderator role matches the role saved in Railway.',
    ].join('\n'),
    flags: MessageFlags.Ephemeral,
  });

  return false;
}

module.exports = {
  isModerator,
  requireModerator,
};
