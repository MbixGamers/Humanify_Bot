# Discord Staff Management Bot

A comprehensive Discord bot for managing staff shifts, applications (resignations and LOA), and tracking active staff members.

## Features

### 📅 Shift Management
- **Login**: Start a shift with custom duration (e.g., 1h, 30m, 2h)
- **Logout**: Manually end your shift
- **Extend**: Add time to your current shift
- **Auto-Expiry**: Automatically removes On-Duty role when shift ends
- **Reminders**: DM notification 5 minutes before shift ends
- **Role Assignment**: Automatically assigns/removes On-Duty role

### 📝 Applications System
- **Resignation Applications**: Submit resignation with reason
- **LOA Applications**: Submit Leave of Absence with reason and duration
- **Approval Workflow**: Managers can accept/deny applications
- **Notifications**: Applicants receive DMs when applications are processed
- **Highest Role Display**: Shows applicant's highest role in management channel
- **LOA Tracking**: Automatically tracks active LOAs with end dates
- **LOA Restrictions**: Users on LOA cannot start shifts
- **Auto-Notifications**: Users receive DM when LOA ends
- **Early Termination**: Use `/end_loa` to end leave early

### 📊 Staff Tracking
- **Active Staff Command**: View all staff currently on shift
- **Shift History**: Automatically logs completed shifts
- **Real-time Updates**: Shows elapsed time and remaining time

### ⚙️ Per-Server Configuration
- Set custom On-Duty role
- Configure management channel for applications
- Add additional manager roles (beyond administrators)
- View current server configuration

## Commands

### Staff Commands
- `/shift` - Display shift management panel with Login/Logout/Extend buttons
- `/active_staff` - View all staff members currently on shift
- `/resign` - Submit a resignation application
- `/loa` - Submit a Leave of Absence application
- `/end_loa` - End your Leave of Absence early

### Admin Commands (Administrator Permission Required)
- `/setup on_duty_role [role]` - Set the On-Duty role
- `/setup management_channel [channel]` - Set the management channel
- `/setup add_manager_role [role]` - Add a manager role
- `/setup remove_manager_role [role]` - Remove a manager role
- `/setup view` - View current configuration

## Installation & Deployment

### Prerequisites
- Node.js v16.9.0 or higher
- A Discord Bot Token ([Create one here](https://discord.com/developers/applications))

### Local Setup

1. **Extract the bot files**
```bash
unzip discord-bot.zip
cd discord-bot
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Configure environment variables**
   - Open `.env` file
   - Replace with your bot token and client ID:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
```

4. **Start the bot**
```bash
npm start
# or
yarn start
# or directly
node init.js
```

The `init.js` file performs pre-flight checks before starting the bot:
- Validates environment variables
- Creates data directory if needed
- Verifies all dependencies are installed
- Checks for required command and utility files

### Katabump Deployment

1. **Prepare the bot**
   - Ensure `.env` file has your bot credentials
   - Zip all files: `discord-bot.zip`

2. **Upload to Katabump**
   - Upload the zip file to your Katabump hosting
   - Set start command: `node init.js` or `npm start`
   - Bot will automatically check dependencies and start

### Discord Bot Setup

1. **Create Bot Application**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application"
   - Go to "Bot" section
   - Click "Reset Token" to get your token
   - Copy the Client ID from "General Information"

2. **Bot Permissions**
   Required permissions:
   - `Manage Roles` - To assign/remove On-Duty role
   - `Send Messages` - To send updates
   - `Send Messages in Threads` - For thread support
   - `Embed Links` - For rich embeds
   - `Use Slash Commands` - For command functionality

3. **Invite Bot to Server**
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=268445760&scope=bot%20applications.commands
   ```
   Replace `YOUR_CLIENT_ID` with your actual client ID

## Server Configuration Guide

### First-Time Setup

1. **Create Required Role**
   - Create a role (e.g., "Staff On Duty") in your Discord server
   - This role should grant access to staff-only channels

2. **Create Management Channel**
   - Create a private channel (e.g., "staff-applications")
   - Only managers/admins should have access

3. **Configure Bot**
   ```
   /setup on_duty_role [Select your On-Duty role]
   /setup management_channel [Select your management channel]
   ```

4. **Optional: Add Manager Roles**
   ```
   /setup add_manager_role [Select role]
   ```
   By default, only users with Administrator permission can manage applications.

### Usage Example

**Staff Member Starting Shift:**
1. Use `/shift` command
2. Click "Login" button
3. Enter duration (e.g., "2h" for 2 hours)
4. Bot assigns On-Duty role
5. Receive reminder 5 minutes before shift ends
6. Role auto-removed when shift expires

**Submitting LOA:**
1. Use `/loa` command
2. Fill in reason and duration
3. Application sent to management channel
4. Manager accepts/denies
5. Receive DM notification with result

## Data Storage

The bot uses local JSON files for data storage:
- Location: `/data/` directory
- Format: One file per server (`{guildId}.json`)
- Stored data:
  - Server configuration
  - Active shifts
  - Shift history (last 100 shifts)

## Troubleshooting

### Bot not responding to commands
- Ensure bot has proper permissions
- Check if bot is online
- Verify slash commands are registered (check console on startup)

### Role not being assigned
- Ensure bot's role is higher than the On-Duty role in server settings
- Check bot has "Manage Roles" permission

### Can't see slash commands
- Wait a few minutes for Discord to sync commands
- Try kicking and re-inviting the bot
- Ensure bot has "Use Slash Commands" permission

### Application buttons not working
- Ensure you have Administrator permission or a configured manager role
- Check management channel is properly configured

## Technical Details

- **Framework**: Discord.js v14
- **Storage**: Local JSON files
- **Background Tasks**: Shift checker runs every 30 seconds
- **Time Format**: ISO timestamps with Discord formatting
- **Reminder Timing**: 5 minutes before shift end
- **History Limit**: 100 most recent shifts per server

## Support

For issues or questions:
1. Check the troubleshooting section
2. Verify bot configuration using `/setup view`
3. Check console logs for error messages

## License

MIT License - Feel free to modify and use for your server!

---

**Bot Version**: 1.0.0  
**Last Updated**: December 2025