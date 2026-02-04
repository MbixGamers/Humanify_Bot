const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildData, getConfig } = require('../utils/storage');
const { formatTimestamp } = require('../utils/shiftManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('bans')
    .setDescription('List recent bans performed by staff'),

  async execute(interaction) {
    const { guildId, member } = interaction;
    const config = getConfig(guildId);

    // Permission check
    const hasPermission = member.permissions.has(PermissionFlagsBits.Administrator) || 
                         config.managerRoleIds.some(roleId => member.roles.cache.has(roleId));

    if (!hasPermission) {
      return interaction.reply({ content: '❌ You do not have permission to view the ban list.', ephemeral: true });
    }

    const data = getGuildData(guildId);
    const banLogs = data.banLogs || [];

    if (banLogs.length === 0) {
      return interaction.reply({ content: 'ℹ️ No bans have been recorded in this server yet.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🔨 Recent Bans')
      .setTimestamp();

    // Show last 10 bans
    const list = banLogs.slice(-10).reverse().map((ban, i) => {
      return `**${i + 1}. ${ban.targetTag}** (${ban.targetId})\n└ Reason: ${ban.reason}\n└ By: <@${ban.moderatorId}> on ${formatTimestamp(ban.timestamp)}`;
    }).join('\n\n');

    embed.setDescription(list);

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
