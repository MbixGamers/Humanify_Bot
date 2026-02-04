const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { getConfig } = require('../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resign')
    .setDescription('Submit a resignation application'),
  
  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('resign_modal')
      .setTitle('Resignation Application');
    
    const reasonInput = new TextInputBuilder()
      .setCustomId('reason')
      .setLabel('Reason for Resignation')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Please explain your reason for resigning...')
      .setRequired(true)
      .setMaxLength(1000);
    
    const firstRow = new ActionRowBuilder().addComponents(reasonInput);
    modal.addComponents(firstRow);
    
    await interaction.showModal(modal);
  },
  
  async handleModal(interaction) {
    const { guildId, user, guild } = interaction;
    const config = getConfig(guildId);
    
    if (!config.managementChannelId) {
      return interaction.reply({
        content: '❌ Management channel not configured. Please contact an administrator to set it up using `/setup`.',
        ephemeral: true,
      });
    }
    
    const reason = interaction.fields.getTextInputValue('reason');
    
    try {
      const managementChannel = await guild.channels.fetch(config.managementChannelId);
      
      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('📄 Resignation Application')
        .setDescription(`**Staff Member:** ${user.tag} (${user.id})\n**User:** <@${user.id}>\n\n**Reason:**\n${reason}`)
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`app_resign_accept_${user.id}`)
            .setLabel('Accept')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
          new ButtonBuilder()
            .setCustomId(`app_resign_deny_${user.id}`)
            .setLabel('Deny')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
        );
      
      await managementChannel.send({ embeds: [embed], components: [row] });
      
      await interaction.reply({
        content: '✅ Your resignation application has been submitted to management for review.',
        ephemeral: true,
      });
    } catch (error) {
      console.error('Error submitting resignation:', error);
      return interaction.reply({
        content: '❌ Failed to submit resignation. Please contact an administrator.',
        ephemeral: true,
      });
    }
  },
  
  async handleButton(interaction, action, userId) {
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
      
      // Notify the applicant
      try {
        const applicant = await interaction.client.users.fetch(userId);
        await applicant.send({
          embeds: [{
            color: 0x00FF00,
            title: '✅ Resignation Accepted',
            description: `Your resignation application in **${interaction.guild.name}** has been **accepted** by ${interaction.user.tag}.`,
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
            title: '❌ Resignation Denied',
            description: `Your resignation application in **${interaction.guild.name}** has been **denied** by ${interaction.user.tag}.`,
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