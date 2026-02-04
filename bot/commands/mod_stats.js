const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildData, getConfig } = require('../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod_stats')
    .setDescription('View moderation stats (bans/kicks) for staff')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The staff member to view stats for (leave empty for all)')
        .setRequired(false)),

  async execute(interaction) {
    const { guildId, options, member, guild } = interaction;
    const targetUser = options.getUser('user');
    const config = getConfig(guildId);

    // Permission check
    const hasPermission = member.permissions.has(PermissionFlagsBits.Administrator) || 
                         config.managerRoleIds.some(roleId => member.roles.cache.has(roleId));

    if (!hasPermission) {
      return interaction.reply({ content: '❌ You do not have permission to view moderation stats.', ephemeral: true });
    }

    const data = getGuildData(guildId);
    const stats = data.staffStats || {};

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🛡️ Moderation Statistics')
      .setTimestamp();

    if (targetUser) {
      const userStats = stats[targetUser.id] || { totalBans: 0, totalKicks: 0 };
      embed.setDescription(`Moderation stats for ${targetUser}`)
        .addFields(
          { name: 'Total Bans', value: `\`${userStats.totalBans || 0}\``, inline: true },
          { name: 'Total Kicks', value: `\`${userStats.totalKicks || 0}\``, inline: true }
        );
    } else {
      // Show leaderboard
      const sortedStaff = Object.entries(stats)
        .filter(([_, s]) => (s.totalBans || 0) > 0 || (s.totalKicks || 0) > 0)
        .sort((a, b) => ((b[1].totalBans || 0) + (b[1].totalKicks || 0)) - ((a[1].totalBans || 0) + (a[1].totalKicks || 0)))
        .slice(0, 10);

      if (sortedStaff.length === 0) {
        embed.setDescription('No moderation actions have been recorded yet.');
      } else {
        const list = sortedStaff.map(([id, s], i) => {
          return `**${i + 1}.** <@${id}>\n└ Bans: \`${s.totalBans || 0}\` | Kicks: \`${s.totalKicks || 0}\``;
        }).join('\n');
        embed.setDescription('Top Moderators (Bans + Kicks)\n\n' + list);
      }
    }

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
