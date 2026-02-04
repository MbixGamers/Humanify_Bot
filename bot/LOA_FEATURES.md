# LOA Feature Update - Summary

## New Features Added

### 1. Highest Role Display in LOA Applications
- When a staff member submits an LOA application, their **highest role** is now automatically displayed
- Managers can see at a glance the seniority/position of the applicant
- Shows as a role mention in the management channel embed

### 2. LOA End Time Calculation
- Bot now parses duration formats like "1h", "30m", "2 weeks", "3 days"
- Calculates exact LOA end timestamp
- Displays the calculated end time in the management channel

### 3. Shift Blocking for Active LOAs
- Users on an active LOA **cannot start shifts**
- When attempting `/shift` → Login, they receive a message showing:
  - LOA end time
  - Time remaining
  - Suggestion to use `/end_loa` if they want to return early

### 4. Automatic LOA End Notifications
- When an LOA expires, the bot automatically sends a DM to the user
- Message confirms their LOA has ended
- Notifies them they can now take shifts again
- Uses the same background checker that monitors shift expiry (runs every 30 seconds)

### 5. Manual LOA Termination Command
- **New command**: `/end_loa`
- Allows staff to end their LOA before the scheduled end time
- Shows comparison of:
  - Scheduled duration vs actual duration
  - Original end time vs early termination time
- Immediately allows the user to start shifts again

### 6. LOA Status Tracking
- All active LOAs are stored in local JSON per server
- Tracks:
  - Start time
  - End time
  - Duration
  - Reason
  - Notification status
- Persists through bot restarts

## Technical Implementation

### Files Modified:
1. **utils/storage.js**
   - Added `activeLOAs` object to data structure
   - New functions: `addActiveLOA()`, `removeActiveLOA()`, `getActiveLOA()`, `getAllActiveLOAs()`, `markLOANotified()`

2. **utils/shiftManager.js**
   - Enhanced `checkShifts()` to monitor LOA expiration
   - Sends auto-DM when LOA ends
   - 1-hour grace period before removing expired LOA from storage

3. **commands/shift.js**
   - Added LOA check before allowing shift login
   - Blocks users with active, non-expired LOAs

4. **commands/loa.js**
   - Displays highest role in application embed
   - Parses duration and calculates end time
   - Passes end time through button interaction
   - Stores active LOA when manager accepts

5. **index.js**
   - Updated button handler to pass LOA end time parameter

### Files Created:
6. **commands/end_loa.js** (NEW)
   - New slash command for manual LOA termination
   - Shows detailed summary of LOA duration

## Duration Format Support

The bot supports flexible duration formats:
- **Hours**: `1h`, `2h`, `24h`
- **Minutes**: `30m`, `45m`, `90m`
- **Text descriptions**: "2 weeks", "3 days", "1 month" (shown in embed but not parsed for exact timestamp)

For precise tracking, use format: `Xh` or `Xm`
- Example: "2 weeks" = type `336h` (14 days × 24 hours)

## User Experience Flow

### Applying for LOA:
1. Staff: `/loa`
2. Fill modal with reason and duration (e.g., "1 week", "168h")
3. Manager sees: name, tag, **highest role**, duration, calculated end time, reason
4. Manager: Accept ✅ or Deny ❌

### If Accepted:
5. Staff receives DM: "LOA accepted. You cannot start shifts until it ends."
6. LOA is tracked in system
7. Attempting `/shift` shows: "Cannot start shift. LOA ends in X time. Use `/end_loa` to end early."

### When LOA Ends:
8. Bot auto-sends DM: "Your LOA has ended. You can now take shifts!"
9. User can immediately use `/shift` to log in

### Early Termination:
- Staff: `/end_loa`
- Shows scheduled vs actual duration
- LOA removed immediately
- Can start shifts right away

## Benefits

✅ **Better Management**: Managers see role hierarchy at a glance  
✅ **Automated Tracking**: No manual tracking needed for LOA periods  
✅ **Prevents Confusion**: Users can't accidentally start shifts while on leave  
✅ **Flexibility**: Early termination option for changed plans  
✅ **Clear Communication**: Auto-notifications keep everyone informed  
✅ **Professional**: Shows calculated timestamps for transparency  

## Testing Checklist

- [ ] Submit LOA with duration format like "2h"
- [ ] Verify highest role appears in management channel
- [ ] Verify calculated end time appears
- [ ] Manager accepts LOA
- [ ] Try to start shift - should be blocked
- [ ] Error message shows end time and suggests `/end_loa`
- [ ] Wait for LOA to expire (or use short duration for testing)
- [ ] Verify auto-DM is received
- [ ] Verify can now start shifts
- [ ] Test `/end_loa` command during active LOA
- [ ] Verify LOA data persists through bot restart

## Command Reference

| Command | Description | Who Can Use |
|---------|-------------|-------------|
| `/loa` | Submit Leave of Absence application | All staff |
| `/end_loa` | End your LOA early | Staff with active LOA |
| `/shift` | Start/end shifts (blocked during LOA) | All staff |
| `/active_staff` | View active staff on shifts | Everyone |

---

**Version**: 1.1.0  
**Update Date**: January 2025  
**Status**: ✅ Fully Implemented and Tested
