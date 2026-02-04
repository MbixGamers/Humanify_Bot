const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { updateConfig, getConfig } = require('../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure the Staff Management System (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('on_duty_role')
        .setDescription('Set the On-Duty role')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to assign when staff are on duty')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('management_channel')
        .setDescription('Set the management channel for applications')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel where applications will be sent')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('report_log_channel')
        .setDescription('Set the channel where user reports will be sent')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('The channel for reports')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('report_cooldown')
        .setDescription('Set the cooldown for the report command in seconds')
        .addIntegerOption(option =>
          option
            .setName('seconds')
            .setDescription('Cooldown in seconds (0 to disable)')
            .setRequired(true)
            .setMinValue(0)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('add_manager_role')
        .setDescription('Add a manager role (in addition to administrators)')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role that can manage applications')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove_manager_role')
        .setDescription('Remove a manager role')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to remove from managers')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('loa_role')
        .setDescription('Set the Leave of Absence role')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to assign when staff are on LOA')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('add_allowed_role')
        .setDescription('Add a role that is allowed to use bot commands')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to allow')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove_allowed_role')
        .setDescription('Remove a role from allowed command users')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to remove')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current configuration')
    ),
  
  async execute(interaction) {
    const { guildId, options } = interaction;
    const subcommand = options.getSubcommand();
    
    if (subcommand === 'on_duty_role') {
      const role = options.getRole('role');
      updateConfig(guildId, { onDutyRoleId: role.id });
      
      return interaction.reply({
        content: `✅ On-Duty role set to ${role}`,
        ephemeral: true,
      });
    }

    else if (subcommand === 'loa_role') {
      const role = options.getRole('role');
      updateConfig(guildId, { loaRoleId: role.id });
      
      return interaction.reply({
        content: `✅ Leave of Absence role set to ${role}`,
        ephemeral: true,
      });
    }

    else if (subcommand === 'add_allowed_role') {
      const role = options.getRole('role');
      const config = getConfig(guildId);
      
      if (!config.allowedRoleIds) config.allowedRoleIds = [];
      
      if (config.allowedRoleIds.length >= 10) {
        return interaction.reply({
          content: '❌ You can only have a maximum of 10 allowed roles.',
          ephemeral: true,
        });
      }

      if (config.allowedRoleIds.includes(role.id)) {
        return interaction.reply({
          content: `⚠️ ${role} is already an allowed role.`,
          ephemeral: true,
        });
      }
      
      config.allowedRoleIds.push(role.id);
      updateConfig(guildId, { allowedRoleIds: config.allowedRoleIds });
      
      return interaction.reply({
        content: `✅ Added ${role} to allowed command roles.`,
        ephemeral: true,
      });
    }

    else if (subcommand === 'remove_allowed_role') {
      const role = options.getRole('role');
      const config = getConfig(guildId);
      
      if (!config.allowedRoleIds || !config.allowedRoleIds.includes(role.id)) {
        return interaction.reply({
          content: `⚠️ ${role} is not in the allowed roles list.`,
          ephemeral: true,
        });
      }
      
      config.allowedRoleIds = config.allowedRoleIds.filter(id => id !== role.id);
      updateConfig(guildId, { allowedRoleIds: config.allowedRoleIds });
      
      return interaction.reply({
        content: `✅ Removed ${role} from allowed command roles.`,
        ephemeral: true,
      });
    }
    
    else if (subcommand === 'management_channel') {
      const channel = options.getChannel('channel');
      updateConfig(guildId, { managementChannelId: channel.id });
      
      return interaction.reply({
        content: `✅ Management channel set to ${channel}`,
        ephemeral: true,
      });
    }

    else if (subcommand === 'report_log_channel') {
      const channel = options.getChannel('channel');
      updateConfig(guildId, { reportLogChannelId: channel.id });
      
      return interaction.reply({
        content: `✅ Report log channel set to ${channel}`,
        ephemeral: true,
      });
    }

    else if (subcommand === 'report_cooldown') {
      const seconds = options.getInteger('seconds');
      updateConfig(guildId, { reportCooldown: seconds });
      
      return interaction.reply({
        content: `✅ Report cooldown set to **${seconds}** seconds.`,
        ephemeral: true,
      });
    }
    
    else if (subcommand === 'add_manager_role') {
      const role = options.getRole('role');
      const config = getConfig(guildId);
      
      if (config.managerRoleIds.includes(role.id)) {
        return interaction.reply({
          content: `⚠️ ${role} is already a manager role.`,
          ephemeral: true,
        });
      }
      
      config.managerRoleIds.push(role.id);
      updateConfig(guildId, { managerRoleIds: config.managerRoleIds });
      
      return interaction.reply({
        content: `✅ Added ${role} as a manager role.`,
        ephemeral: true,
      });
    }
    
    else if (subcommand === 'remove_manager_role') {
      const role = options.getRole('role');
      const config = getConfig(guildId);
      
      if (!config.managerRoleIds.includes(role.id)) {
        return interaction.reply({
          content: `⚠️ ${role} is not a manager role.`,
          ephemeral: true,
        });
      }
      
      config.managerRoleIds = config.managerRoleIds.filter(id => id !== role.id);
      updateConfig(guildId, { managerRoleIds: config.managerRoleIds });
      
      return interaction.reply({
        content: `✅ Removed ${role} from manager roles.`,
        ephemeral: true,
      });
    }
    
    else if (subcommand === 'view') {
      const config = getConfig(guildId);
      const { guild } = interaction;
      
      let onDutyRole = 'Not set';
      if (config.onDutyRoleId) {
        try {
          const role = await guild.roles.fetch(config.onDutyRoleId);
          onDutyRole = role ? role.toString() : 'Role not found';
        } catch (error) {
          onDutyRole = 'Error fetching role';
        }
      }

      let loaRole = 'Not set';
      if (config.loaRoleId) {
        try {
          const role = await guild.roles.fetch(config.loaRoleId);
          loaRole = role ? role.toString() : 'Role not found';
        } catch (error) {
          loaRole = 'Error fetching role';
        }
      }
      
      let managementChannel = 'Not set';
      if (config.managementChannelId) {
        try {
          const channel = await guild.channels.fetch(config.managementChannelId);
          managementChannel = channel ? channel.toString() : 'Channel not found';
        } catch (error) {
          managementChannel = 'Error fetching channel';
        }
      }

      let reportLogChannel = 'Not set';
      if (config.reportLogChannelId) {
        try {
          const channel = await guild.channels.fetch(config.reportLogChannelId);
          reportLogChannel = channel ? channel.toString() : 'Channel not found';
        } catch (error) {
          reportLogChannel = 'Error fetching channel';
        }
      }
      
      let managerRoles = 'None (Administrators only)';
      if (config.managerRoleIds.length > 0) {
        const roleList = [];
        for (const roleId of config.managerRoleIds) {
          try {
            const role = await guild.roles.fetch(roleId);
            if (role) roleList.push(role.toString());
          } catch (error) {
            console.error('Error fetching role:', error);
          }
        }
        if (roleList.length > 0) {
          managerRoles = roleList.join(', ');
        }
      }

      let allowedRoles = 'Everyone (No restriction)';
      if (config.allowedRoleIds && config.allowedRoleIds.length > 0) {
        const roleList = [];
        for (const roleId of config.allowedRoleIds) {
          try {
            const role = await guild.roles.fetch(roleId);
            if (role) roleList.push(role.toString());
          } catch (error) {
            console.error('Error fetching role:', error);
          }
        }
        if (roleList.length > 0) {
          allowedRoles = roleList.join(', ');
        }
      }
      
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('⚙️ Server Configuration')
        .addFields(
          { name: 'On-Duty Role', value: onDutyRole, inline: true },
          { name: 'LOA Role', value: loaRole, inline: true },
          { name: 'Management Channel', value: managementChannel, inline: false },
          { name: 'Report Log Channel', value: reportLogChannel, inline: false },
          { name: 'Report Cooldown', value: `${config.reportCooldown || 60} seconds`, inline: true },
          { name: 'Additional Manager Roles', value: managerRoles, inline: false },
          { name: 'Allowed Command Roles', value: allowedRoles, inline: false }
        )
        .setFooter({ text: 'Use /setup commands to modify configuration' })
        .setTimestamp();
      
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};