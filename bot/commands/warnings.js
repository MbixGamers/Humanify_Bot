const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getWarnings, getConfig } = require('../utils/storage');
const { formatTimestamp } = require('../utils/shiftManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a selected user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to view warnings for')
        .setRequired(true)),

  async execute(interaction) {
    const { guildId, options, member } = interaction;
    const targetUser = options.getUser('user');
    const config = getConfig(guildId);

    // Permission check: Admin, Manager, or configured roles
    const hasPermission = member.permissions.has(PermissionFlagsBits.Administrator) || 
                         config.managerRoleIds.some(roleId => member.roles.cache.has(roleId)) ||
                         config.allowedRoleIds.some(roleId => member.roles.cache.has(roleId));

    if (!hasPermission) {
      return interaction.reply({
        content: '❌ You do not have permission to view warnings.',
        ephemeral: true
      });
    }

    const warnings = getWarnings(guildId, targetUser.id);

    if (warnings.length === 0) {
      return interaction.reply({
        content: `✅ ${targetUser.tag} has no warnings.`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle(`⚠️ Warnings for ${targetUser.tag}`)
      .setThumbnail(targetUser.displayAvatarURL())
      .setDescription(`Total Warnings: **${warnings.length}**`)
      .setTimestamp();

    const warningList = warnings.slice(-10).map((w, index) => {
      return `**${index + 1}. [${w.id}]** ${w.reason}\n└ *By <@${w.moderatorId}> on ${formatTimestamp(w.timestamp)}*`;
    }).join('\n\n');

    embed.addFields({ name: 'Recent Warnings', value: warningList });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
