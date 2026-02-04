const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getActiveShift, addActiveShift, removeActiveShift, updateShiftEndTime, getConfig, getActiveLOA } = require('../utils/storage');
const { parseDuration, formatDuration, formatTimestamp } = require('../utils/shiftManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift')
    .setDescription('Manage your staff shift'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📅 Staff Shift Management')
      .setDescription('Click the buttons below to manage your shift:\n\n🟢 **Login** - Start a new shift\n🔴 **Logout** - End your current shift\n⏱️ **Extend Shift** - Add more time to your shift')
      .setTimestamp();
    
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('shift_login')
          .setLabel('Login')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🟢'),
        new ButtonBuilder()
          .setCustomId('shift_logout')
          .setLabel('Logout')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔴'),
        new ButtonBuilder()
          .setCustomId('shift_extend')
          .setLabel('Extend Shift')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('⏱️')
      );
    
    await interaction.reply({ embeds: [embed], components: [row] });
  },
  
  async handleButton(interaction) {
    const { customId, guildId, user, member } = interaction;
    const config = getConfig(guildId);
    
    // Check if user is on LOA (Moved up to check before any login/modal logic)
    if (customId === 'shift_login' || customId.startsWith('shift_login_')) {
      const activeLOA = getActiveLOA(guildId, user.id);
      const hasLOARole = config.loaRoleId && member.roles.cache.has(config.loaRoleId);

      if (activeLOA || hasLOARole) {
        const now = Date.now();
        const timeRemaining = (activeLOA?.endTime || 0) - now;
        
        let content = '❌ You cannot start a shift while on Leave of Absence.';
        if (activeLOA && timeRemaining > 0) {
          content += `\n\n**LOA End Time:** ${formatTimestamp(activeLOA.endTime)}\n**Time Remaining:** ${formatDuration(timeRemaining)}\n\nYou can end your LOA early using \`/end_loa\` if you wish to return sooner.`;
        } else if (hasLOARole) {
          content += `\n\nYou currently have the Leave of Absence role. If your leave is over, please use \`/end_loa\` to remove the role and start working again.`;
        }

        return interaction.reply({
          content,
          ephemeral: true,
        });
      }
    }

    // Check if on-duty role is configured
    if (!config.onDutyRoleId) {
      return interaction.reply({
        content: '❌ Server configuration incomplete. An administrator needs to set up the On-Duty role using `/setup`.',
        ephemeral: true,
      });
    }
    
    if (customId === 'shift_login') {
      // Check if already on shift
      const existingShift = getActiveShift(guildId, user.id);
      if (existingShift) {
        return interaction.reply({
          content: `⚠️ You are already on a shift that ends ${formatTimestamp(existingShift.endTime)}.`,
          ephemeral: true,
        });
      }
      
      // Show modal to input duration
      const modal = new ModalBuilder()
        .setCustomId(`shift_login_${user.id}`)
        .setTitle('Start Shift');
      
      const durationInput = new TextInputBuilder()
        .setCustomId('duration')
        .setLabel('Shift Duration')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 1h, 30m, 2h, 45m')
        .setRequired(true)
        .setMaxLength(10);
      
      const firstRow = new ActionRowBuilder().addComponents(durationInput);
      modal.addComponents(firstRow);
      
      await interaction.showModal(modal);
    }
    
    else if (customId === 'shift_logout') {
      const activeShift = getActiveShift(guildId, user.id);
      
      if (!activeShift) {
        return interaction.reply({
          content: '❌ You are not currently on a shift.',
          ephemeral: true,
        });
      }
      
      // Remove role
      try {
        await member.roles.remove(config.onDutyRoleId);
        removeActiveShift(guildId, user.id);
        
        const duration = Date.now() - activeShift.startTime;
        
        const embed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('🔴 Shift Ended')
          .setDescription(`Successfully logged out!\n\n**Shift Duration:** ${formatDuration(duration)}\n**Started:** ${formatTimestamp(activeShift.startTime)}\n**Ended:** ${formatTimestamp(Date.now())}`)
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (error) {
        console.error('Error removing role:', error);
        return interaction.reply({
          content: '❌ Failed to remove On-Duty role. Please contact an administrator.',
          ephemeral: true,
        });
      }
    }
    
    else if (customId === 'shift_extend') {
      const activeShift = getActiveShift(guildId, user.id);
      
      if (!activeShift) {
        return interaction.reply({
          content: '❌ You are not currently on a shift.',
          ephemeral: true,
        });
      }
      
      // Show modal to input extension duration
      const modal = new ModalBuilder()
        .setCustomId(`shift_extend_${user.id}`)
        .setTitle('Extend Shift');
      
      const durationInput = new TextInputBuilder()
        .setCustomId('extension')
        .setLabel('Extension Duration')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('e.g., 5m, 10m, 30m, 1h')
        .setRequired(true)
        .setMaxLength(10);
      
      const firstRow = new ActionRowBuilder().addComponents(durationInput);
      modal.addComponents(firstRow);
      
      await interaction.showModal(modal);
    }
  },
  
  async handleModal(interaction) {
    const { guildId, user, member } = interaction;
    const config = getConfig(guildId);
    const duration = interaction.fields.getTextInputValue('duration');
    
    const durationMs = parseDuration(duration, 'shift');
    
    if (!durationMs) {
      return interaction.reply({
        content: '❌ Invalid duration format. Please use formats like: `1h`, `30m`, `2h`, `45m`',
        ephemeral: true,
      });
    }
    
    const now = Date.now();
    const endTime = now + durationMs;
    
    // Add role
    try {
      await member.roles.add(config.onDutyRoleId);
      
      // Save shift data
      addActiveShift(guildId, user.id, {
        startTime: now,
        endTime: endTime,
        duration: duration,
        reminded: false,
        messages: 0,
      });
      
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🟢 Shift Started')
        .setDescription(`Successfully logged in!\n\n**Duration:** ${formatDuration(durationMs)}\n**Start Time:** ${formatTimestamp(now)}\n**End Time:** ${formatTimestamp(endTime)}\n\nℹ️ You will receive a reminder 5 minutes before your shift ends.`)
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Error adding role:', error);
      return interaction.reply({
        content: '❌ Failed to add On-Duty role. Please contact an administrator.',
        ephemeral: true,
      });
    }
  },
  
  async handleExtendModal(interaction) {
    const { guildId, user } = interaction;
    const extension = interaction.fields.getTextInputValue('extension');
    
    const extensionMs = parseDuration(extension, 'shift');
    
    if (!extensionMs) {
      return interaction.reply({
        content: '❌ Invalid duration format. Please use formats like: `5m`, `10m`, `30m`, `1h`',
        ephemeral: true,
      });
    }
    
    const activeShift = getActiveShift(guildId, user.id);
    
    if (!activeShift) {
      return interaction.reply({
        content: '❌ You are not currently on a shift.',
        ephemeral: true,
      });
    }
    
    const newEndTime = activeShift.endTime + extensionMs;
    updateShiftEndTime(guildId, user.id, newEndTime);
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('⏱️ Shift Extended')
      .setDescription(`Successfully extended your shift by **${formatDuration(extensionMs)}**!\n\n**New End Time:** ${formatTimestamp(newEndTime)}`)
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};