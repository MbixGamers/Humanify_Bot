const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildData, getConfig } = require('../utils/storage');
const { formatTimestamp } = require('../utils/shiftManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kicks')
    .setDescription('List recent kicks performed by staff'),

  async execute(interaction) {
    const { guildId, member } = interaction;
    const config = getConfig(guildId);

    // Permission check
    const hasPermission = member.permissions.has(PermissionFlagsBits.Administrator) || 
                         config.managerRoleIds.some(roleId => member.roles.cache.has(roleId));

    if (!hasPermission) {
      return interaction.reply({ content: '❌ You do not have permission to view the kick list.', ephemeral: true });
    }

    const data = getGuildData(guildId);
    const kickLogs = data.kickLogs || [];

    if (kickLogs.length === 0) {
      return interaction.reply({ content: 'ℹ️ No kicks have been recorded in this server yet.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0xFFA500)
      .setTitle('👢 Recent Kicks')
      .setTimestamp();

    // Show last 10 kicks
    const list = kickLogs.slice(-10).reverse().map((kick, i) => {
      return `**${i + 1}. ${kick.targetTag}** (${kick.targetId})\n└ Reason: ${kick.reason}\n└ By: <@${kick.moderatorId}> on ${formatTimestamp(kick.timestamp)}`;
    }).join('\n\n');

    embed.setDescription(list);

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
