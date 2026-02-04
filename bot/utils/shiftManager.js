const { removeActiveShift, getAllActiveShifts, markShiftReminded, getConfig, getAllActiveLOAs, removeActiveLOA, markLOANotified } = require('./storage');

const FIVE_MINUTES = 5 * 60 * 1000;
const CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds

function parseDuration(duration, context = 'shift') {
  // Enhanced duration parsing: support hours, minutes, days, weeks, and months
  const match = duration.toLowerCase().trim().match(/^(\d+)\s*([hmdwm]|mo)$/);
  if (!match) return null;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  if (unit === 'm') {
    if (context === 'shift') {
      return value * 60 * 1000; // minutes
    } else {
      // LOA context: 'm' is no longer allowed for months, user must use 'mo'
      return null; 
    }
  } else if (unit === 'mo') {
    return value * 30 * 24 * 60 * 60 * 1000;
  } else if (unit === 'h') {
    return value * 60 * 60 * 1000;
  } else if (unit === 'd') {
    return value * 24 * 60 * 60 * 1000;
  } else if (unit === 'w') {
    return value * 7 * 24 * 60 * 60 * 1000;
  }
  
  return null;
}

function formatDuration(ms) {
  if (ms <= 0) return '0 minutes';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) {
    const remainingDays = days % 30;
    return `${months} month${months > 1 ? 's' : ''}${remainingDays > 0 ? `, ${remainingDays} day${remainingDays > 1 ? 's' : ''}` : ''}`;
  }
  if (weeks > 0) {
    const remainingDays = days % 7;
    return `${weeks} week${weeks > 1 ? 's' : ''}${remainingDays > 0 ? `, ${remainingDays} day${remainingDays > 1 ? 's' : ''}` : ''}`;
  }
  if (days > 0) {
    const remainingHours = hours % 24;
    return `${days} day${days > 1 ? 's' : ''}${remainingHours > 0 ? `, ${remainingHours} hour${remainingHours > 1 ? 's' : ''}` : ''}`;
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours} hour${hours > 1 ? 's' : ''}${remainingMinutes > 0 ? `, ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}` : ''}`;
  }
  return `${minutes} minute${minutes > 1 ? 's' : ''}`;
}

function formatTimestamp(timestamp) {
  return `<t:${Math.floor(timestamp / 1000)}:F>`; // Discord full date/time format
}

async function checkShifts(client) {
  const now = Date.now();
  
  for (const guild of client.guilds.cache.values()) {
    try {
      const activeShifts = getAllActiveShifts(guild.id);
      const activeLOAs = getAllActiveLOAs(guild.id);
      const config = getConfig(guild.id);
      
      // Check and expire LOAs
      for (const [userId, loa] of Object.entries(activeLOAs)) {
        const timeRemaining = loa.endTime - now;
        
        // LOA has expired
        if (timeRemaining <= 0 && !loa.notified) {
          try {
            const user = await client.users.fetch(userId);
            await user.send({
              embeds: [{
                color: 0x00FF00,
                title: '✅ Leave of Absence Ended',
                description: `Your Leave of Absence in **${guild.name}** has ended.\n\nYou are now ready to take shifts again. Use \`/shift\` to log in when ready!`,
                timestamp: new Date().toISOString(),
              }],
            });
            markLOANotified(guild.id, userId);
            
            // Remove LOA record
            removeActiveLOA(guild.id, userId);

            // Remove LOA role if configured
            if (config.loaRoleId) {
              try {
                const member = await guild.members.fetch(userId);
                if (member.roles.cache.has(config.loaRoleId)) {
                  await member.roles.remove(config.loaRoleId);
                }
              } catch (error) {
                console.error(`Failed to remove LOA role for ${userId}:`, error.message);
              }
            }
          } catch (error) {
            console.error(`Failed to notify ${userId} about LOA end:`, error.message);
            // Mark as notified even if DM fails
            markLOANotified(guild.id, userId);
          }
        }
      }
      
      if (!config.onDutyRoleId) continue;
      
      for (const [userId, shift] of Object.entries(activeShifts)) {
        const timeRemaining = shift.endTime - now;
        
        // Send reminder 5 minutes before shift ends
        if (timeRemaining <= FIVE_MINUTES && timeRemaining > 0 && !shift.reminded) {
          try {
            const user = await client.users.fetch(userId);
            await user.send({
              embeds: [{
                color: 0xFFA500,
                title: '⏰ Shift Ending Soon',
                description: `Your shift in **${guild.name}** will end in approximately **5 minutes** (${formatTimestamp(shift.endTime)}).\n\nPlease wrap up your tasks or use the **Extend Shift** button to add more time.`,
                timestamp: new Date().toISOString(),
              }],
            });
            markShiftReminded(guild.id, userId);
          } catch (error) {
            console.error(`Failed to send reminder to ${userId}:`, error.message);
          }
        }
        
        // Auto-logout when shift expires
        if (timeRemaining <= 0) {
          try {
            const member = await guild.members.fetch(userId);
            await member.roles.remove(config.onDutyRoleId);
            removeActiveShift(guild.id, userId);
            
            // Notify user
            try {
              const user = await client.users.fetch(userId);
              await user.send({
                embeds: [{
                  color: 0xFF0000,
                  title: '🔴 Shift Ended',
                  description: `Your shift in **${guild.name}** has automatically ended.\n\nYou have been logged out and your On-Duty role has been removed.`,
                  timestamp: new Date().toISOString(),
                }],
              });
            } catch (error) {
              console.error(`Failed to notify ${userId} about shift end:`, error.message);
            }
          } catch (error) {
            console.error(`Failed to auto-logout ${userId}:`, error.message);
            // Remove from active shifts even if role removal fails
            removeActiveShift(guild.id, userId);
          }
        }
      }
    } catch (error) {
      console.error(`Error checking shifts for guild ${guild.id}:`, error);
    }
  }
}

function startShiftChecker(client) {
  console.log('🔄 Starting shift checker...');
  setInterval(() => checkShifts(client), CHECK_INTERVAL);
}

module.exports = {
  parseDuration,
  formatDuration,
  formatTimestamp,
  startShiftChecker,
};