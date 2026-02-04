# Quick Start Guide

## 🚀 Getting Started in 3 Steps

### Step 1: Upload to Katabump
1. Download `discord-bot.zip` from `/app/discord-bot.zip`
2. Upload to your Katabump hosting
3. Bot will automatically install dependencies and start

### Step 2: Invite Bot to Your Server
Use this invite link (replace YOUR_CLIENT_ID with `1457790457139433533`):
```
https://discord.com/api/oauth2/authorize?client_id=1457790457139433533&permissions=268445760&scope=bot%20applications.commands
```

### Step 3: Configure Your Server
1. Create a role for staff (e.g., "Staff On Duty")
2. Create a management channel (e.g., "staff-applications")
3. Run these commands:
   ```
   /setup on_duty_role [Select your role]
   /setup management_channel [Select your channel]
   ```

## ✨ You're Done!

### Try It Out
- Staff: `/shift` to manage shifts
- View: `/active_staff` to see who's working
- Apply: `/resign` or `/loa` for applications

## 📋 Important Notes

### Bot Token
Your bot is already configured with token:
- Token: `MTQ1Nzc5MDQ1NzEzOTQzMzUzMw.GiHG1-.dSMBcFB0nAhSBStH8Sh8twUG_PWBT7w32G-GzQ`
- Client ID: `1457790457139433533`

### Required Permissions
The bot needs:
- ✅ Manage Roles (to assign/remove On-Duty role)
- ✅ Send Messages (to send notifications)
- ✅ Embed Links (for rich messages)
- ✅ Use Slash Commands (for all commands)

### Role Hierarchy
⚠️ **IMPORTANT**: The bot's role must be **higher** than the On-Duty role in your server's role list. Otherwise, it won't be able to assign/remove the role.

To fix:
1. Go to Server Settings → Roles
2. Drag the bot's role above the On-Duty role

## 🎯 Common Use Cases

### Scenario 1: Staff Starting Shift
```
1. Staff: /shift → Click "Login"
2. Enter: "2h" (for 2 hour shift)
3. Bot assigns On-Duty role
4. Gets reminder 5 mins before end
5. Role auto-removed when shift ends
```

### Scenario 2: Submitting LOA
```
1. Staff: /loa
2. Fill reason and duration (e.g., "2 weeks", "3 days", "1h")
3. Manager gets notification with user's highest role
4. Manager clicks Accept/Deny
5. If accepted, LOA is tracked and user cannot start shifts
6. Staff receives DM with result and restrictions
7. Auto-DM sent when LOA ends: "You can now take shifts!"
8. Use /end_loa to end leave early if needed
```

### Scenario 3: Checking Active Staff
```

### LOA (Leave of Absence) Features
Staff on an active LOA cannot start shifts until:
- The LOA period ends (auto-notification sent)
- They manually end it with `/end_loa`

When trying to start a shift while on LOA, staff will see:
- Current LOA end time
- Time remaining
- Option to use `/end_loa` command

1. Anyone: /active_staff
2. See all staff on duty
3. Shows start time, end time, elapsed, remaining
```

## 🔧 Troubleshooting

### "Server configuration incomplete" error
- Run `/setup on_duty_role` first

### Role not being assigned
- Check bot's role is higher than On-Duty role
- Verify bot has "Manage Roles" permission

### Can't see commands
- Wait 1-2 minutes for Discord to sync
- Try kicking and re-inviting the bot

### Buttons not working
- Only Administrators and configured manager roles can use application buttons
- Check `/setup view` to see who can manage

## 📊 Data Storage

- All data stored locally per server
- Location: `/data/{server_id}.json`
- Includes: config, active shifts, history
- Persists through bot restarts

## 🎉 Advanced Features

### Add More Manager Roles
```bash
/setup add_manager_role [role]
```
Now that role can also accept/deny applications (in addition to admins)

### View Configuration
```bash
/setup view
```
See all current settings for your server

### Extend Shifts
Staff can click "Extend Shift" button to add more time without logging out

## 🆘 Need Help?

1. Check `/setup view` to verify configuration
2. Check bot console logs for errors
3. Ensure bot has proper permissions
4. Verify role hierarchy is correct

---

**Made with ❤️ for Discord Staff Management**
