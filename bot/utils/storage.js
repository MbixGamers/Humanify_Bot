const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getGuildDataPath(guildId) {
  return path.join(DATA_DIR, `${guildId}.json`);
}

function getGuildData(guildId) {
  const filePath = getGuildDataPath(guildId);
  
  if (!fs.existsSync(filePath)) {
    const defaultData = {
      config: {
        onDutyRoleId: null,
        managementChannelId: null,
        reportLogChannelId: null,
        reportCooldown: 60, // Default 60 seconds
        managerRoleIds: [], // Additional manager roles beyond admin
        allowedRoleIds: [], // Roles allowed to use bot commands
      },
      activeShifts: {},
      shiftHistory: [],
      activeLOAs: {}, // userId: { startTime, endTime, reason, duration, notified }
      staffStats: {}, // userId: { totalMessages, totalDurationMs, totalBans, totalKicks }
      warnings: {}, // userId: [{ moderatorId, reason, timestamp }]
      banLogs: [], // [{ targetId, targetTag, moderatorId, reason, timestamp }]
      kickLogs: [], // [{ targetId, targetTag, moderatorId, reason, timestamp }]
    };
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  
  const data = fs.readFileSync(filePath, 'utf8');
  const parsedData = JSON.parse(data);
  
  // Add activeLOAs if it doesn't exist (for existing servers)
  if (!parsedData.activeLOAs) {
    parsedData.activeLOAs = {};
  }
  
  // Add staffStats if it doesn't exist (for existing servers)
  if (!parsedData.staffStats) {
    parsedData.staffStats = {};
  }

  // Add warnings if it doesn't exist (for existing servers)
  if (!parsedData.warnings) {
    parsedData.warnings = {};
  }
  
  return parsedData;
}

function saveGuildData(guildId, data) {
  const filePath = getGuildDataPath(guildId);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function addWarning(guildId, userId, moderatorId, reason) {
  const data = getGuildData(guildId);
  if (!data.warnings) {
    data.warnings = {};
  }
  if (!data.warnings[userId]) {
    data.warnings[userId] = [];
  }
  const warningId = Math.random().toString(36).substring(2, 8).toUpperCase();
  data.warnings[userId].push({
    id: warningId,
    moderatorId,
    reason,
    timestamp: Date.now()
  });
  saveGuildData(guildId, data);
  return warningId;
}

function getWarnings(guildId, userId) {
  const data = getGuildData(guildId);
  return data.warnings ? data.warnings[userId] || [] : [];
}

function removeWarning(guildId, warningId) {
  const data = getGuildData(guildId);
  if (!data.warnings) return false;

  for (const userId in data.warnings) {
    const initialLength = data.warnings[userId].length;
    data.warnings[userId] = data.warnings[userId].filter(w => w.id !== warningId);
    
    if (data.warnings[userId].length < initialLength) {
      saveGuildData(guildId, data);
      return true;
    }
  }
  return false;
}

function addActiveShift(guildId, userId, shiftData) {
  const data = getGuildData(guildId);
  data.activeShifts[userId] = shiftData;
  saveGuildData(guildId, data);
}

function removeActiveShift(guildId, userId) {
  const data = getGuildData(guildId);
  const shift = data.activeShifts[userId];
  
  if (shift) {
    const endTime = Date.now();
    const duration = endTime - shift.startTime;

    // Add to history
    data.shiftHistory.push({
      userId,
      startTime: shift.startTime,
      endTime: endTime,
      scheduledEndTime: shift.endTime,
      duration: shift.duration,
      messages: shift.messages || 0,
    });
    
    // Update permanent stats
    if (!data.staffStats[userId]) {
      data.staffStats[userId] = { totalMessages: 0, totalDurationMs: 0 };
    }
    data.staffStats[userId].totalMessages += (shift.messages || 0);
    data.staffStats[userId].totalDurationMs += duration;

    // Keep only last 100 shifts in history
    if (data.shiftHistory.length > 100) {
      data.shiftHistory = data.shiftHistory.slice(-100);
    }
    
    delete data.activeShifts[userId];
    saveGuildData(guildId, data);
  }
}

function incrementShiftMessageCount(guildId, userId) {
  const data = getGuildData(guildId);
  if (data.activeShifts[userId]) {
    data.activeShifts[userId].messages = (data.activeShifts[userId].messages || 0) + 1;
    saveGuildData(guildId, data);
  }
}

function getActiveShift(guildId, userId) {
  const data = getGuildData(guildId);
  return data.activeShifts[userId] || null;
}

function getAllActiveShifts(guildId) {
  const data = getGuildData(guildId);
  return data.activeShifts;
}

function updateShiftEndTime(guildId, userId, newEndTime) {
  const data = getGuildData(guildId);
  if (data.activeShifts[userId]) {
    data.activeShifts[userId].endTime = newEndTime;
    data.activeShifts[userId].reminded = false; // Reset reminder flag
    saveGuildData(guildId, data);
  }
}

function markShiftReminded(guildId, userId) {
  const data = getGuildData(guildId);
  if (data.activeShifts[userId]) {
    data.activeShifts[userId].reminded = true;
    saveGuildData(guildId, data);
  }
}

function updateConfig(guildId, configUpdates) {
  const data = getGuildData(guildId);
  data.config = { ...data.config, ...configUpdates };
  saveGuildData(guildId, data);
}

function getConfig(guildId) {
  const data = getGuildData(guildId);
  return data.config;
}

function addActiveLOA(guildId, userId, loaData) {
  const data = getGuildData(guildId);
  data.activeLOAs[userId] = loaData;
  saveGuildData(guildId, data);
}

function removeActiveLOA(guildId, userId) {
  const data = getGuildData(guildId);
  if (data.activeLOAs && data.activeLOAs[userId]) {
    delete data.activeLOAs[userId];
    saveGuildData(guildId, data);
  }
}

function getActiveLOA(guildId, userId) {
  const data = getGuildData(guildId);
  return data.activeLOAs ? data.activeLOAs[userId] || null : null;
}

function getAllActiveLOAs(guildId) {
  const data = getGuildData(guildId);
  return data.activeLOAs || {};
}

function markLOANotified(guildId, userId) {
  const data = getGuildData(guildId);
  if (data.activeLOAs && data.activeLOAs[userId]) {
    data.activeLOAs[userId].notified = true;
    saveGuildData(guildId, data);
  }
}

function incrementStaffAction(guildId, userId, action, details = null) {
  const data = getGuildData(guildId);
  if (!data.staffStats[userId]) {
    data.staffStats[userId] = { totalMessages: 0, totalDurationMs: 0, totalBans: 0, totalKicks: 0 };
  }
  
  if (action === 'ban') {
    data.staffStats[userId].totalBans = (data.staffStats[userId].totalBans || 0) + 1;
    if (details) {
      if (!data.banLogs) data.banLogs = [];
      data.banLogs.push({
        ...details,
        timestamp: Date.now()
      });
      // Keep last 100 bans
      if (data.banLogs.length > 100) data.banLogs = data.banLogs.slice(-100);
    }
  } else if (action === 'kick') {
    data.staffStats[userId].totalKicks = (data.staffStats[userId].totalKicks || 0) + 1;
    if (details) {
      if (!data.kickLogs) data.kickLogs = [];
      data.kickLogs.push({
        ...details,
        timestamp: Date.now()
      });
      // Keep last 100 kicks
      if (data.kickLogs.length > 100) data.kickLogs = data.kickLogs.slice(-100);
    }
  }
  
  saveGuildData(guildId, data);
}

module.exports = {
  getGuildData,
  saveGuildData,
  addActiveShift,
  removeActiveShift,
  getActiveShift,
  getAllActiveShifts,
  updateShiftEndTime,
  markShiftReminded,
  updateConfig,
  getConfig,
  addActiveLOA,
  removeActiveLOA,
  getActiveLOA,
  getAllActiveLOAs,
  markLOANotified,
  incrementShiftMessageCount,
  addWarning,
  getWarnings,
  removeWarning,
  incrementStaffAction,
};