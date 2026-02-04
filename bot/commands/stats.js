const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getGuildData } = require('../utils/storage');
const { formatDuration } = require('../utils/shiftManager');

async function renderLeaderboard(interaction, page, sortBy, isInitial) {
  const { guildId, guild } = interaction;
  const data = getGuildData(guildId);
  
  if (!data.staffStats || Object.keys(data.staffStats).length === 0) {
    const msg = { content: 'ℹ️ No staff statistics recorded yet.', ephemeral: true };
    return isInitial ? interaction.reply(msg) : interaction.update(msg);
  }

  const staffArray = Object.entries(data.staffStats);
  
  // Sort staff
  staffArray.sort(([, a], [, b]) => {
    if (sortBy === 'messages') {
      return (b.totalMessages || 0) - (a.totalMessages || 0);
    }
    return (b.totalDurationMs || 0) - (a.totalDurationMs || 0);
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(staffArray.length / itemsPerPage);
  const currentPage = Math.max(0, Math.min(page, totalPages - 1));
  const start = currentPage * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedStaff = staffArray.slice(start, end);

  if (paginatedStaff.length === 0 && staffArray.length > 0) {
    const msg = { content: '⏳ Please wait, loading leaderboard...', ephemeral: true };
    return isInitial ? interaction.reply(msg) : interaction.update(msg);
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('🏆 Staff Activity Leaderboard')
    .setDescription(`Showing staff members sorted by **${sortBy === 'messages' ? 'Messages' : 'Duration'}**.\nPage ${currentPage + 1} of ${totalPages}\n\n` + '─'.repeat(30))
    .setThumbnail(guild.iconURL({ dynamic: true }))
    .setTimestamp();

  let leaderboardText = '';
  
  for (let i = 0; i < paginatedStaff.length; i++) {
    const [userId, stats] = paginatedStaff[i];
    const rank = start + i + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '👤';
    let userDisplay = `<@${userId}>`;
    
    try {
      const member = await guild.members.fetch(userId);
      if (member) userDisplay = `**${member.user.displayName || member.user.username}**`;
    } catch (error) {}

    const hours = (stats.totalDurationMs / (1000 * 60 * 60)).toFixed(1);
    
    leaderboardText += `${medal} **#${rank}** | ${userDisplay}\n`;
    leaderboardText += `┗ ⏱️ \`${formatDuration(stats.totalDurationMs)}\` (\`${hours}h\`) — 💬 \`${stats.totalMessages}\` msgs\n\n`;
  }

  embed.setDescription(embed.data.description + '\n\n' + (leaderboardText || '*No statistics in this range.*'));
  
  const userStats = data.staffStats[interaction.user.id];
  if (userStats) {
    const userHours = (userStats.totalDurationMs / (1000 * 60 * 60)).toFixed(1);
    embed.addFields({
      name: '━━━━━━━━━━━━━━━\n⭐ Your Personal Impact',
      value: `> ⏱️ **Total Time:** \`${formatDuration(userStats.totalDurationMs)}\` (\`${userHours}h\`)\n> 💬 **Total Messages:** \`${userStats.totalMessages}\``,
    });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`stats_prev_${currentPage}_${sortBy}`)
      .setLabel('Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage === 0),
    new ButtonBuilder()
      .setCustomId(`stats_next_${currentPage}_${sortBy}`)
      .setLabel('Next')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(currentPage >= totalPages - 1),
    new ButtonBuilder()
      .setCustomId(`stats_toggle_${currentPage}_${sortBy}`)
      .setLabel(`Sort by ${sortBy === 'messages' ? 'Duration' : 'Messages'}`)
      .setEmoji(sortBy === 'messages' ? '⏱️' : '💬')
      .setStyle(ButtonStyle.Primary)
  );

  const response = { embeds: [embed], components: [row], ephemeral: true };
  if (isInitial) {
    await interaction.reply(response);
  } else {
    await interaction.update(response);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View staff leaderboard and statistics'),
  
  async execute(interaction) {
    try {
      await renderLeaderboard(interaction, 0, 'duration', true);
    } catch (error) {
      console.error('Error in stats command:', error);
      const reply = { content: '❌ An error occurred while fetching stats. Please try again later.', ephemeral: true };
      if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
      else await interaction.reply(reply);
    }
  },

  async handleButton(interaction) {
    try {
      const parts = interaction.customId.split('_');
      const action = parts[1];
      let page = parseInt(parts[2]);
      let sortBy = parts[3];

      if (action === 'prev') page--;
      if (action === 'next') page++;
      if (action === 'toggle') {
        sortBy = sortBy === 'messages' ? 'duration' : 'messages';
      }

      await renderLeaderboard(interaction, page, sortBy, false);
    } catch (error) {
      console.error('Error handling stats button:', error);
      await interaction.followUp({ content: '❌ An error occurred while updating the leaderboard.', ephemeral: true });
    }
  }
};
