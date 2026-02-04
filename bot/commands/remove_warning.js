const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { removeWarning, getConfig } = require('../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove_warning')
    .setDescription('Remove a warning using its unique ID')
    .addStringOption(option =>
      option.setName('id')
        .setDescription('The unique ID of the warning to remove')
        .setRequired(true)),

  async execute(interaction) {
    const { guildId, options, member } = interaction;
    const warningId = options.getString('id').toUpperCase();
    const config = getConfig(guildId);

    // Permission check
    const hasPermission = member.permissions.has(PermissionFlagsBits.Administrator) || 
                         config.managerRoleIds.some(roleId => member.roles.cache.has(roleId));

    if (!hasPermission) {
      return interaction.reply({ content: '❌ You do not have permission to remove warnings.', ephemeral: true });
    }

    const success = removeWarning(guildId, warningId);

    if (success) {
      return interaction.reply({
        content: `✅ Warning \`${warningId}\` has been successfully removed.`,
        ephemeral: true
      });
    } else {
      return interaction.reply({
        content: `❌ Could not find a warning with ID \`${warningId}\`.`,
        ephemeral: true
      });
    }
  }
};
