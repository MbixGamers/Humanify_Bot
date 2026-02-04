require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { startShiftChecker } = require('./utils/shiftManager');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`🤖 Bot is running in ${client.guilds.cache.size} servers`);

  // Register slash commands
  const commands = [];
  client.commands.forEach(command => {
    commands.push(command.data.toJSON());
  });

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('🔄 Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );
    console.log('✅ Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }

  // Start shift checker
  startShiftChecker(client);
});

client.on('interactionCreate', async interaction => {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // Check permissions (skip for setup command since it has defaultMemberPermissions)
    if (interaction.commandName !== 'setup') {
      const { getConfig } = require('./utils/storage');
      const config = getConfig(interaction.guildId);

      if (config.allowedRoleIds && config.allowedRoleIds.length > 0) {
        const hasPermission = interaction.member.roles.cache.some(role => config.allowedRoleIds.includes(role.id)) || 
                             interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!hasPermission) {
          return interaction.reply({
            content: '❌ This command is not for you. You do not have the required roles to use this bot.',
            ephemeral: true,
          });
        }
      }
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error('Error executing command:', error);
      const reply = { content: '❌ There was an error executing this command!', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  }

  // Handle button interactions
  if (interaction.isButton()) {
    const { customId } = interaction;

    if (customId.startsWith('shift_')) {
      const shiftCommand = client.commands.get('shift');
      if (shiftCommand && shiftCommand.handleButton) {
        await shiftCommand.handleButton(interaction);
      }
    }

    if (customId.startsWith('app_')) {
      const parts = customId.split('_');
      const type = parts[1];
      const action = parts[2];
      const userId = parts[3];
      const extraParam = parts[4]; // For LOA end time

      if (type === 'resign') {
        const resignCommand = client.commands.get('resign');
        if (resignCommand && resignCommand.handleButton) {
          await resignCommand.handleButton(interaction, action, userId);
        }
      } else if (type === 'loa') {
        const loaCommand = client.commands.get('loa');
        if (loaCommand && loaCommand.handleButton) {
          await loaCommand.handleButton(interaction, action, userId, extraParam);
        }
      }
    }
    if (customId.startsWith('report_')) {
      const reportCommand = client.commands.get('report');
      if (reportCommand && reportCommand.handleButton) {
        await reportCommand.handleButton(interaction);
      }
    }

    if (customId.startsWith('stats_')) {
      const statsCommand = client.commands.get('stats');
      if (statsCommand && statsCommand.handleButton) {
        await statsCommand.handleButton(interaction);
      }
    }
  }

  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    const { customId } = interaction;

    if (customId.startsWith('shift_login_')) {
      const shiftCommand = client.commands.get('shift');
      if (shiftCommand && shiftCommand.handleModal) {
        await shiftCommand.handleModal(interaction);
      }
    }

    if (customId === 'resign_modal') {
      const resignCommand = client.commands.get('resign');
      if (resignCommand && resignCommand.handleModal) {
        await resignCommand.handleModal(interaction);
      }
    }

    if (customId === 'loa_modal') {
      const loaCommand = client.commands.get('loa');
      if (loaCommand && loaCommand.handleModal) {
        await loaCommand.handleModal(interaction);
      }
    }

    if (customId.startsWith('shift_extend_')) {
      const shiftCommand = client.commands.get('shift');
      if (shiftCommand && shiftCommand.handleExtendModal) {
        await shiftCommand.handleExtendModal(interaction);
      }
    }
  }
});

const { getActiveLOA, incrementShiftMessageCount, getActiveShift } = require('./utils/storage');

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  // Track messages for active staff
  const activeShift = getActiveShift(message.guild.id, message.author.id);
  if (activeShift) {
    incrementShiftMessageCount(message.guild.id, message.author.id);
  }

  const mentionedUsers = message.mentions.users;
  if (mentionedUsers.size > 0) {
    for (const [userId, user] of mentionedUsers) {
      const activeLOA = getActiveLOA(message.guild.id, userId);
      if (activeLOA) {
        const now = Date.now();
        if (activeLOA.endTime > now) {
          await message.reply({
            content: `ℹ️ **${user.tag}** is currently on Leave of Absence until <t:${Math.floor(activeLOA.endTime / 1000)}:F>.`,
          });
        }
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);