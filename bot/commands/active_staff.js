const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAllActiveShifts } = require('../utils/storage');
const { formatTimestamp, formatDuration } = require('../utils/shiftManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('active_staff')
    .setDescription('View all staff currently on shift'),
  
  async execute(interaction) {
    const { guildId, guild } = interaction;
    const activeShifts = getAllActiveShifts(guildId);
    
    const entries = Object.entries(activeShifts);
    
    if (entries.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(0x808080)
        .setTitle('📋 Active Staff Members')
        .setDescription('No staff members are currently on shift.')
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed] });
    }
    
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('📋 Active Staff Members')
      .setDescription(`**${entries.length}** staff member(s) currently on shift:\n`);
    
    for (const [userId, shift] of entries) {
      const now = Date.now();
      const endTime = parseInt(shift.endTime);
      const timeRemaining = endTime - now;
      const elapsed = now - shift.startTime;
      
      try {
        const member = await guild.members.fetch(userId);
        const status = timeRemaining > 0 ? `🟢 Active` : `⏰ Overtime`;
        
        embed.addFields({
          name: `${status} ${member.user.tag}`,
          value: `**Start:** ${formatTimestamp(shift.startTime)}\n**End:** ${formatTimestamp(endTime)}\n**Elapsed:** ${formatDuration(elapsed)}\n**Remaining:** ${timeRemaining > 0 ? formatDuration(timeRemaining) : 'Expired'}`,
          inline: false,
        });
      } catch (error) {
        console.error(`Failed to fetch member ${userId}:`, error);
      }
    }
    
    embed.setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  },
};