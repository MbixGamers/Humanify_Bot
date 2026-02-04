const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { getConfig, addWarning, incrementStaffAction } = require('../utils/storage');

const cooldowns = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report')
    .setDescription('Report a user for misconduct')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to report')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('The reason for the report')
        .setRequired(true))
    .addAttachmentOption(option =>
      option.setName('proof')
        .setDescription('Upload a screenshot or image as proof (optional)')
        .setRequired(false)),

  async execute(interaction) {
    const { guildId, guild, user: reporter, options, member } = interaction;
    const targetUser = options.getUser('user');
    const reason = options.getString('reason');
    const proof = options.getAttachment('proof');
    const config = getConfig(guildId);

    // File size limit check (Discord's general limit for non-boosted servers is 25MB, but bots often handle up to 25MB)
    // Let's set a safe limit of 25MB
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (proof && proof.size > MAX_FILE_SIZE) {
      return interaction.reply({
        content: `❌ The attached file is too large (**${(proof.size / (1024 * 1024)).toFixed(2)}MB**). Please upload a file smaller than **25MB**.`,
        ephemeral: true
      });
    }

    if (!config.reportLogChannelId) {
      return interaction.reply({
        content: '❌ Report system is not configured. An admin must set the report log channel using `/setup report_log_channel`.',
        ephemeral: true
      });
    }

    // Cooldown check
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
    if (!isAdmin) {
      const cooldownAmount = (config.reportCooldown || 60) * 1000;
      if (cooldownAmount > 0) {
        const key = `${guildId}_${reporter.id}`;
        if (cooldowns.has(key)) {
          const expirationTime = cooldowns.get(key) + cooldownAmount;
          if (Date.now() < expirationTime) {
            const timeLeft = Math.ceil((expirationTime - Date.now()) / 1000);
            return interaction.reply({
              content: `⏳ Please wait **${timeLeft}** more seconds before reporting again.`,
              ephemeral: true
            });
          }
        }
        cooldowns.set(key, Date.now());
        setTimeout(() => cooldowns.delete(key), cooldownAmount);
      }
    }

    try {
      // Defer the reply immediately to prevent "application did not respond"
      await interaction.deferReply({ ephemeral: true });
      
      // Send initial progress message
      await interaction.editReply({
        content: '⏳ **Processing your report...**\n[░░░░░░░░░░░░░░░░░░░░] 0%'
      });

      const logChannel = await guild.channels.fetch(config.reportLogChannelId);
      if (!logChannel) {
        throw new Error('Could not find report log channel');
      }

      // Update progress: channel found
      await interaction.editReply({
        content: '⏳ **Uploading proof and generating report...**\n[▓▓▓▓░░░░░░░░░░░░░░░░] 20%'
      });

      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('🚨 New User Report')
        .addFields(
          { name: 'Reported User', value: `${targetUser} (${targetUser.id})`, inline: true },
          { name: 'Reporter', value: `${reporter} (${reporter.id})`, inline: true },
          { name: 'Reason', value: reason }
        )
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder().setCustomId(`report_warn_${targetUser.id}`).setLabel('Warn').setEmoji('⚠️').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`report_timeout_${targetUser.id}`).setLabel('Timeout').setEmoji('⏳').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(`report_kick_${targetUser.id}`).setLabel('Kick').setEmoji('👢').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`report_ban_${targetUser.id}`).setLabel('Ban').setEmoji('🔨').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`report_reject_${targetUser.id}`).setLabel('Reject').setEmoji('✅').setStyle(ButtonStyle.Success)
        );

      const messageOptions = { embeds: [embed], components: [row] };

      if (proof) {
        // Update progress: proof detected
        await interaction.editReply({
          content: '⏳ **Attaching proof file...**\n[▓▓▓▓▓▓▓▓░░░░░░░░░░░░] 40%'
        });

        // Validation for proof object to prevent crashes
        if (proof.url) {
          if (proof.contentType && proof.contentType.startsWith('image/')) {
            embed.setImage(proof.url);
          } else {
            messageOptions.files = [{
              attachment: proof.url,
              name: proof.name || 'proof_video.mp4'
            }];
          }
        }
      }

      // Update progress: sending to log
      await interaction.editReply({
        content: '⏳ **Sending report to management...**\n[▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░] 80%'
      });

      await logChannel.send(messageOptions);

      await interaction.editReply({
        content: '✅ **Report Submitted!**\n[▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓] 100%\nYour report has been submitted to management.'
      });
    } catch (error) {
      console.error('Error sending report:', error);
      // Use followUp or editReply depending on if it was deferred
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: '❌ Failed to send report. Please check if the bot has access to the report log channel.'
        });
      } else {
        await interaction.reply({
          content: '❌ Failed to send report. Please check if the bot has access to the report log channel.',
          ephemeral: true
        });
      }
    }
  },

  async handleButton(interaction) {
    const { customId, member, guild } = interaction;
    const [prefix, action, targetUserId] = customId.split('_');

    if (prefix !== 'report') return;

    // Permissions check - only admins or managers can handle reports
    const config = getConfig(guild.id);
    const hasPermission = member.permissions.has(PermissionFlagsBits.Administrator) || 
                         config.managerRoleIds.some(roleId => member.roles.cache.has(roleId));

    if (!hasPermission) {
      return interaction.reply({ content: '❌ You do not have permission to handle reports.', ephemeral: true });
    }

    await interaction.deferUpdate();

    const targetUser = await guild.client.users.fetch(targetUserId).catch(() => null);
    const targetMember = await guild.members.fetch(targetUserId).catch(() => null);

    let actionTaken = '';
    let color = 0x00FF00;

    try {
      const originalEmbed = interaction.message.embeds[0];
      const reasonField = originalEmbed.fields.find(f => f.name === 'Reason');
      const reason = reasonField ? reasonField.value : 'No reason provided';

      switch (action) {
        case 'warn':
          actionTaken = 'Warned';
          const warningId = addWarning(guild.id, targetUserId, member.id, reason);
          if (targetUser) await targetUser.send(`⚠️ You have been warned in ${guild.name} for: ${reason}\n**Warning ID:** \`${warningId}\``).catch(() => {});
          break;
        case 'timeout':
          actionTaken = 'Timed Out (10m)';
          if (targetMember) await targetMember.timeout(10 * 60 * 1000, reason).catch(() => {});
          break;
        case 'kick':
          actionTaken = 'Kicked';
          if (targetMember) {
            await targetMember.kick(reason).catch(() => {});
            incrementStaffAction(guild.id, member.id, 'kick', {
              targetId: targetUserId,
              targetTag: targetUser ? targetUser.tag : 'Unknown User',
              moderatorId: member.id,
              reason: reason
            });
          }
          break;
        case 'ban':
          actionTaken = 'Banned';
          if (targetMember) {
            await targetMember.ban({ reason }).catch(() => {});
            incrementStaffAction(guild.id, member.id, 'ban', {
              targetId: targetUserId,
              targetTag: targetUser ? targetUser.tag : 'Unknown User',
              moderatorId: member.id,
              reason: reason
            });
          }
          break;
        case 'reject':
          actionTaken = 'Rejected';
          color = 0x808080;
          break;
      }

      const updatedEmbed = EmbedBuilder.from(originalEmbed)
        .setColor(color)
        .addFields({ name: 'Decision', value: `${actionTaken} by ${member.user.tag}` });

      const editOptions = { embeds: [updatedEmbed], components: [] };
      
      // Preserve attachments if they exist in the original message
      if (interaction.message.attachments.size > 0) {
        // In Discord.js, when editing a message, you can keep existing attachments
        // by not providing a 'files' array, or by explicitly handling them.
        // However, to ensure they aren't removed, we can just leave them alone.
        // If the original message had files, we don't want to overwrite them with nothing.
      }

      await interaction.editReply(editOptions);
    } catch (error) {
      console.error('Error handling report action:', error);
      await interaction.followUp({ content: `❌ Error performing action: ${error.message}`, ephemeral: true });
    }
  }
};
