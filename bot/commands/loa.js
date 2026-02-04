const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { getConfig, addActiveLOA, getActiveLOA } = require('../utils/storage');
const { parseDuration, formatTimestamp, formatDuration } = require('../utils/shiftManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loa')
    .setDescription('Submit a Leave of Absence (LOA) application'),
  
  async execute(interaction) {
    const { guildId, user } = interaction;
    
    // Check if user is on shift
    const { getActiveShift } = require('../utils/storage');
    const activeShift = getActiveShift(guildId, user.id);
    if (activeShift) {
      return interaction.reply({
        content: '❌ You are currently on shift. Please end your shift before applying for LOA.',
        ephemeral: true,
      });
    }
    
    // Check if user already has an active LOA
    const activeLOA = getActiveLOA(guildId, user.id);
    if (activeLOA) {
      const now = Date.now();
      if (activeLOA.endTime > now) {
        return interaction.reply({
          content: '❌ You already have an active Leave of Absence request or application. Use `/end_loa` to end your current leave before applying for a new one.',
          ephemeral: true,
        });
      }
    }

    const modal = new ModalBuilder()
      .setCustomId('loa_modal')
      .setTitle('Leave of Absence Application');
    
    const reasonInput = new TextInputBuilder()
      .setCustomId('reason')
      .setLabel('Reason for LOA')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Please explain your reason for taking leave...')
      .setRequired(true)
      .setMaxLength(1000);
    
    const durationInput = new TextInputBuilder()
      .setCustomId('duration')
      .setLabel('Duration')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., 1mo (month), 1w (week), 1d (day)')
      .setRequired(true)
      .setMaxLength(50);
    
    const firstRow = new ActionRowBuilder().addComponents(reasonInput);
    const secondRow = new ActionRowBuilder().addComponents(durationInput);
    modal.addComponents(firstRow, secondRow);
    
    await interaction.showModal(modal);
  },
  
  async handleModal(interaction) {
    const { guildId, user, guild, member } = interaction;
    const config = getConfig(guildId);
    
    if (!config.managementChannelId) {
      return interaction.reply({
        content: '❌ Management channel not configured. Please contact an administrator to set it up using `/setup`.',
        ephemeral: true,
      });
    }
    
    const reason = interaction.fields.getTextInputValue('reason');
    const duration = interaction.fields.getTextInputValue('duration');
    
    // Get highest role
    const roles = member.roles.cache
      .filter(role => role.id !== guild.id) // Exclude @everyone
      .sort((a, b) => b.position - a.position);
    const highestRole = roles.first();
    const roleDisplay = highestRole ? `<@&${highestRole.id}>` : 'No roles';
    
    const durationMs = parseDuration(duration, 'loa');
    
    if (!durationMs) {
      const isMinutes = duration.toLowerCase().endsWith('m') && !duration.toLowerCase().endsWith('mo');
      return interaction.reply({
        content: isMinutes 
          ? '❌ LOA cannot be set in minutes. Please use `1mo` for 1 month, or use days (`d`) / weeks (`w`).' 
          : '❌ Invalid duration format. Please use formats like: `1mo` (month), `1w` (week), `1d` (day).',
        ephemeral: true,
      });
    }
    
    let loaEndTime = Date.now() + durationMs;
    let loaEndDisplay = `\n**LOA End Time:** ${formatTimestamp(loaEndTime)}`;
    
    try {
      const managementChannel = await guild.channels.fetch(config.managementChannelId);
      
      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('📅 Leave of Absence Application')
        .setDescription(`**Staff Member:** ${user.tag} (${user.id})\n**User:** <@${user.id}>\n**Highest Role:** ${roleDisplay}\n\n**Duration:** ${duration}${loaEndDisplay}\n\n**Reason:**\n${reason}`)
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`app_loa_accept_${user.id}_${loaEndTime || 0}`)
            .setLabel('Accept')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
          new ButtonBuilder()
            .setCustomId(`app_loa_deny_${user.id}_${loaEndTime || 0}`)
            .setLabel('Deny')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
        );
      
      await managementChannel.send({ embeds: [embed], components: [row] });
      
      await interaction.reply({
        content: '✅ Your Leave of Absence application has been submitted to management for review.',
        ephemeral: true,
      });
    } catch (error) {
      console.error('Error submitting LOA:', error);
      return interaction.reply({
        content: '❌ Failed to submit LOA. Please contact an administrator.',
        ephemeral: true,
      });
    }
  },
  
  async handleButton(interaction, action, userId, loaEndTime) {
    const { member } = interaction;
    
    // Check if user has administrator permission
    const hasAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
    
    // Check if user has a configured manager role
    const config = getConfig(interaction.guildId);
    const hasManagerRole = config.managerRoleIds.some(roleId => member.roles.cache.has(roleId));
    
    if (!hasAdmin && !hasManagerRole) {
      return interaction.reply({
        content: '❌ You do not have permission to manage applications. Only administrators or designated managers can do this.',
        ephemeral: true,
      });
    }
    
    // Defer the update to prevent "Unknown Interaction" errors
    await interaction.deferUpdate();
    
    const originalEmbed = interaction.message.embeds[0];
    const newEmbed = EmbedBuilder.from(originalEmbed);
    
    if (action === 'accept') {
      newEmbed.setColor(0x00FF00);
      newEmbed.addFields({
        name: '✅ Status',
        value: `Accepted by ${interaction.user.tag} at <t:${Math.floor(Date.now() / 1000)}:F>`,
        inline: false,
      });
      
      // Add to active LOAs if end time is available
      const endTime = parseInt(loaEndTime);
      if (endTime && endTime > 0) {
        const startTime = Date.now();
        const duration = endTime - startTime;
        
        addActiveLOA(interaction.guildId, userId, {
          startTime,
          endTime,
          duration: formatDuration(endTime - startTime),
          reason: originalEmbed.description.split('**Reason:**\n')[1] || 'N/A',
          notified: false,
        });

        // Assign LOA role if configured
        const config = getConfig(interaction.guildId);
        if (config.loaRoleId) {
          try {
            const targetMember = await interaction.guild.members.fetch(userId);
            await targetMember.roles.add(config.loaRoleId);
            
            // Remove on-duty role if they are currently working
            if (config.onDutyRoleId && targetMember.roles.cache.has(config.onDutyRoleId)) {
              await targetMember.roles.remove(config.onDutyRoleId);
            }
          } catch (error) {
            console.error('Failed to assign LOA role:', error);
          }
        }
      }
      
      // Notify the applicant
      try {
        const applicant = await interaction.client.users.fetch(userId);
        const loaMessage = endTime && endTime > 0 
          ? `\n\n⚠️ **Important:** You cannot start shifts while on LOA. Use \`/end_loa\` to end your leave early if needed.`
          : '';
        
        await applicant.send({
          embeds: [{
            color: 0x00FF00,
            title: '✅ LOA Accepted',
            description: `Your Leave of Absence application in **${interaction.guild.name}** has been **accepted** by ${interaction.user.tag}.${loaMessage}`,
            timestamp: new Date().toISOString(),
          }],
        });
      } catch (error) {
        console.error('Failed to notify applicant:', error);
      }
    } else if (action === 'deny') {
      newEmbed.setColor(0xFF0000);
      newEmbed.addFields({
        name: '❌ Status',
        value: `Denied by ${interaction.user.tag} at <t:${Math.floor(Date.now() / 1000)}:F>`,
        inline: false,
      });
      
      // Notify the applicant
      try {
        const applicant = await interaction.client.users.fetch(userId);
        await applicant.send({
          embeds: [{
            color: 0xFF0000,
            title: '❌ LOA Denied',
            description: `Your Leave of Absence application in **${interaction.guild.name}** has been **denied** by ${interaction.user.tag}.`,
            timestamp: new Date().toISOString(),
          }],
        });
      } catch (error) {
        console.error('Failed to notify applicant:', error);
      }
    }
    
    await interaction.editReply({ embeds: [newEmbed], components: [] });
  },
};