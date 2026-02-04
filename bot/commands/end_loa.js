const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getActiveLOA, removeActiveLOA } = require('../utils/storage');
const { formatTimestamp, formatDuration } = require('../utils/shiftManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('end_loa')
    .setDescription('End your Leave of Absence early'),
  
  async execute(interaction) {
    const { guildId, user } = interaction;
    
    const activeLOA = getActiveLOA(guildId, user.id);
    
    if (!activeLOA) {
      return interaction.reply({
        content: '❌ You are not currently on a Leave of Absence.',
        ephemeral: true,
      });
    }
    
    const now = Date.now();
    const wasScheduledToEnd = activeLOA.endTime;
    const actualDuration = now - activeLOA.startTime;
    const scheduledDuration = wasScheduledToEnd - activeLOA.startTime;
    
    // Remove the LOA
    removeActiveLOA(guildId, user.id);

    // Remove LOA role if configured
    const { getConfig } = require('../utils/storage');
    const config = getConfig(guildId);
    if (config.loaRoleId) {
      try {
        const member = await interaction.guild.members.fetch(user.id);
        if (member.roles.cache.has(config.loaRoleId)) {
          await member.roles.remove(config.loaRoleId);
        }
      } catch (error) {
        console.error('Failed to remove LOA role:', error);
      }
    }
    
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Leave of Absence Ended')
      .setDescription(`You have successfully ended your Leave of Absence early.\n\n**Started:** ${formatTimestamp(activeLOA.startTime)}\n**Was Scheduled to End:** ${formatTimestamp(wasScheduledToEnd)}\n**Actual Duration:** ${formatDuration(actualDuration)}\n**Scheduled Duration:** ${formatDuration(scheduledDuration)}\n\n✅ You are now able to start shifts again using \`/shift\`.`)
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
