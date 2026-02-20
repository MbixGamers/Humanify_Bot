# Discord Staff Management Bot

## Overview

A Discord bot for managing staff operations in Discord servers. The bot provides shift tracking with automatic role assignment, Leave of Absence (LOA) applications with approval workflows, resignation handling, user reporting, and staff activity statistics. Each Discord server (guild) maintains its own independent configuration and data.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Bot Framework
- **Platform**: Discord.js v14 for Discord API interactions
- **Runtime**: Node.js with environment variable configuration via dotenv
- **Entry Point**: `init.js` performs pre-flight checks (env vars, directories) then loads `index.js`
- **Storage Model**: File-based JSON storage, one file per Discord server
- **Location**: `/data/{guildId}.json` files
- **Structure**: Each server stores config, active shifts, shift history, active LOAs, and staff statistics
- **No external database**: Simple synchronous file I/O through `utils/storage.js` utility module
- **Rationale**: Simplicity over scalability - suitable for small to medium Discord communities without database infrastructure requirements

### Core Command Modules (`/commands/`)
| Command | Purpose |
|---------|---------|
| `shift.js` | Login/logout/extend shift with button interactions and duration modals |
| `loa.js` | Leave of Absence applications with modal forms and manager approval |
| `end_loa.js` | Early LOA termination |
| `resign.js` | Resignation applications with approval workflow |
| `report.js` | User misconduct reporting with moderation action buttons |
| `active_staff.js` | View currently on-duty staff members |
| `stats.js` | Staff leaderboard and activity statistics |
| `setup.js` | Server configuration (admin only) |

### Utility Modules (`/utils/`)
| Module | Purpose |
|--------|---------|
| `storage.js` | JSON file CRUD operations, guild data management, LOA/shift state tracking |
| `shiftManager.js` | Duration parsing (h/m/d/w/mo), time formatting, background checker loop |

### Background Processing
- Shift checker runs every 30 seconds via `startShiftChecker()` in shiftManager
- Handles automatic shift expiry and On-Duty role removal
- Sends DM reminders 5 minutes before shift ends
- Automatically ends LOAs when duration expires and notifies users
- Tracks message counts for staff on active shifts

### Per-Server Configuration Schema
```javascript
{
  config: {
    onDutyRoleId: string,        // Role assigned during shifts
    managementChannelId: string, // Channel for application approvals
    reportLogChannelId: string,  // Channel for user reports
    managerRoleIds: string[],    // Additional approval roles
    loaRoleId: string,           // Role assigned during LOA
    allowedRoleIds: string[]     // Roles permitted to use commands
  },
  activeShifts: {},   // userId -> shift data
  shiftHistory: [],   // Completed shift records
  activeLOAs: {},     // userId -> LOA data
  staffStats: {}      // userId -> activity statistics
}
```

### Interaction Patterns
- Slash commands for primary user interactions
- Modal forms for text input (reasons, durations)
- Button components for quick actions (login/logout, approve/deny)
- Ephemeral replies for user-specific feedback
- Embed messages for rich formatted responses

## External Dependencies

### NPM Packages
| Package | Version | Purpose |
|---------|---------|---------|
| `discord.js` | ^14.14.1 | Discord API wrapper, slash commands, embeds, buttons, modals |
| `dotenv` | ^16.4.1 | Environment variable loading from .env file |

### Environment Variables Required
| Variable | Purpose |
|----------|---------|
| `DISCORD_TOKEN` | Bot authentication token |
| `CLIENT_ID` | Discord application client ID for command registration |

### Discord API Permissions Required
- Manage Roles (assign/remove On-Duty and LOA roles)
- Send Messages (notifications and embeds)
- Embed Links (rich message formatting)
- Use Slash Commands (all bot interactions)
- Kick/Ban Members (for report moderation actions)

### External Services
- **Discord API**: Primary integration for all bot functionality
- No database services required
- No third-party APIs beyond Discord
