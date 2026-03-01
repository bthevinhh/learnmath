/**
 * StudyMate AI - DEMO MODE (No Firebase)
 * All data stored locally in localStorage
 * ✅ Ready for GitHub Pages
 */

// Mock Firebase initialization (demo only)
let db = null;
let storage = null;
let initError = false;

function initializeFirebase() {
  console.log('✅ Demo Mode: Using localStorage instead of Firebase');
  // No-op for demo mode
}

// ═══════════════════════════════════════
// DEMO MODE - localStorage FUNCTIONS
// ═══════════════════════════════════════

function isValidUserId(userId) {
  return typeof userId === 'string' && userId.trim().length > 0 && userId.length <= 128;
}

function isValidStats(stats) {
  if (!stats || typeof stats !== 'object') return false;
  
  const { xp, level, streak } = stats;
  return (
    (xp === undefined || (Number.isInteger(xp) && xp >= 0)) &&
    (level === undefined || (Number.isInteger(level) && level >= 1 && level <= 100)) &&
    (streak === undefined || (Number.isInteger(streak) && streak >= 0))
  );
}

// Get user data from localStorage (demo mode)
async function getUserData(userId) {
  if (!isValidUserId(userId)) {
    throw new Error('Invalid user ID format');
  }
  
  try {
    const data = localStorage.getItem('user_' + userId);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw new Error(`Failed to fetch user data: ${error.message}`);
  }
}

// Update user stats in localStorage (demo mode)
async function updateUserStats(userId, stats) {
  if (!isValidUserId(userId)) {
    throw new Error('Invalid user ID format');
  }
  
  if (!isValidStats(stats)) {
    throw new Error('Invalid stats format');
  }
  
  try {
    let userData = await getUserData(userId) || {};
    
    if (stats.xp !== undefined) userData.xp = stats.xp;
    if (stats.level !== undefined) userData.level = stats.level;
    if (stats.streak !== undefined) userData.streak = stats.streak;
    
    userData.lastActive = new Date().toISOString();
    localStorage.setItem('user_' + userId, JSON.stringify(userData));
  } catch (error) {
    console.error('Error updating user stats:', error);
    throw new Error(`Failed to update stats: ${error.message}`);
  }
}

// Save learning session in localStorage (demo mode)
async function saveLearningSession(userId, sessionData) {
  if (!isValidUserId(userId)) {
    throw new Error('Invalid user ID format');
  }
  
  if (!sessionData || typeof sessionData !== 'object') {
    throw new Error('Invalid session data format');
  }
  
  try {
    let sessions = JSON.parse(localStorage.getItem('sessions_' + userId) || '[]');
    const now = new Date().toISOString();
    
    sessions.push({
      ...sessionData,
      createdAt: now,
      updatedAt: now,
      id: 'session_' + Date.now()
    });
    
    // Keep only last 100 sessions
    if (sessions.length > 100) {
      sessions = sessions.slice(-100);
    }
    
    localStorage.setItem('sessions_' + userId, JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving session:', error);
    throw new Error(`Failed to save session: ${error.message}`);
  }
}

// Get user learning sessions from localStorage (demo mode)
async function getUserSessions(userId, limit = 10) {
  if (!isValidUserId(userId)) {
    throw new Error('Invalid user ID format');
  }
  
  try {
    const sessions = JSON.parse(localStorage.getItem('sessions_' + userId) || '[]');
    return sessions.reverse().slice(0, Math.min(limit, 100));
  } catch (error) {
    console.error('Error fetching sessions:', error);
    throw new Error(`Failed to fetch sessions: ${error.message}`);
  }
}

// Delete user data from localStorage (demo mode)
async function deleteUserData(userId) {
  if (!isValidUserId(userId)) {
    throw new Error('Invalid user ID format');
  }
  
  try {
    localStorage.removeItem('user_' + userId);
    localStorage.removeItem('sessions_' + userId);
    localStorage.removeItem('focusRooms');
    localStorage.removeItem('learning_data');
  } catch (error) {
    console.error('Error deleting user data:', error);
    throw new Error(`Failed to delete user data: ${error.message}`);
  }
}
