/**
 * StudyMate AI - CORE MODULE
 * Quản lý: State, SYSTEM_PROMPT, Init, Navigation, Subject Selection
 */

// ═══════════════════════════════════════  // STATE MANAGEMENT
// ═══════════════════════════════════════
const state = {
  apiKey: sessionStorage.getItem('sm_api_key') || '',
  model: sessionStorage.getItem('sm_model') || 'claude',
  subject: 'Toán học',
  pdfText: '',
  chatHistory: [],
  modalModel: 'claude',
  focusRooms: (() => {
    try {
      return JSON.parse(localStorage.getItem('focusRooms')) || [];
    } catch {
      return [];
    }
  })(),
  focusRoomId: null,
  currentRoom: null,
  userName: localStorage.getItem('userName') || generateUserId(),
  learning: (() => {
    try {
      return JSON.parse(localStorage.getItem('learning_data')) || createDefaultLearningData();
    } catch {
      return createDefaultLearningData();
    }
  })(),
  sessionStartTime: null,
  sessionMinutesTracked: 0,
};

function generateUserId() {
  return 'User_' + Math.random().toString(36).substr(2, 5) + '_' + Date.now().toString(36).substr(-4);
}

function createDefaultLearningData() {
  return {
    studySessions: [],
    aiQuestions: 0,
    pomodorosCompleted: 0,
    activeStreakDates: [],
    lastSessionDate: null,
    totalXP: 0,
    level: 1,
  };
}

// ═══════════════════════════════════════
// DEMO MODE - localStorage FUNCTIONS (from firebase-config.js)
// ═══════════════════════════════════════
let db = null;
let storage = null;
let initError = false;

function initializeFirebase() {
  console.log('✅ Demo Mode: Using localStorage instead of Firebase');
  // No-op for demo mode
}

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

// Initialize demo data after a short delay to allow DOM to be ready
setTimeout(() => {
  if (typeof initializeDemoData === 'function') {
    initializeDemoData();
  }
}, 500);

// Cache DOM elements to avoid repeated queries
const DOMCache = {};
function getElement(selector) {
  if (!DOMCache[selector]) {
    DOMCache[selector] = document.querySelector(selector);
  }
  return DOMCache[selector];
}

const SYSTEM_PROMPT = `Bạn là StudyMate AI, một trợ lý học tập thông minh và thân thiện dành cho học sinh Việt Nam. 
Nhiệm vụ: Giúp học sinh hiểu bài, giải bài tập, tóm tắt tài liệu, và trả lời mọi câu hỏi học thuật.
Nguyên tắc:
- Luôn giải thích từng bước rõ ràng, dễ hiểu
- Dùng tiếng Việt, ngôn ngữ thân thiện, gần gũi với học sinh
- Khi giải toán/lý/hóa: trình bày bài giải có đánh số bước
- Khuyến khích và động viên học sinh
- Nếu có tài liệu PDF: tóm tắt và trả lời dựa trên nội dung đó`;

// ═══════════════════════════════════════
// INIT & LIFECYCLE
// ═══════════════════════════════════════
let initComplete = false;
let activeIntervals = [];

// Validate DOM elements exist
function validateDOM() {
  const required = [
    'chat-msgs', 'chat-ta', 'dashboard', 'weekly-chart',
    'pomo-tabs', 'ring-time', 'schedule-tabs', 'schedule-content',
    'fc-rooms', 'demos'
  ];
  
  const missing = required.filter(id => !document.getElementById(id));
  
  if (missing.length > 0) {
    console.warn('⚠️ Missing DOM elements:', missing);
    return false;
  }
  
  console.log('✓ All required DOM elements found');
  return true;
}

window.onload = () => {
  if (initComplete) return; // Prevent double initialization
  initComplete = true;
  
  try {
    // Validate DOM is ready
    if (!validateDOM()) {
      console.error('❌ DOM validation failed. Some features may not work.');
    }
    
    // Ensure Firebase is initialized first
    if (typeof initializeFirebase === 'function') {
      initializeFirebase();
    }
    
    // Wait a moment for Firebase to be ready
    setTimeout(() => {
      updateApiStatus();
      initPomodoro();
      renderFocusRooms();
      animateDashboardCounters();
      initDashboardInteractions();
      startSessionTracking();
      updateDashboardStats();
      drawWeeklyChart();
      
      // Initialize with sample data if no rooms exist
      if (state.focusRooms.length === 0) {
        createSampleFocusRoom();
      }
      
      console.log('✓ App initialized successfully');
    }, 100);
  } catch (error) {
    console.error('Initialization error:', error);
  }
};

function createSampleFocusRoom() {
  const sampleRoom = {
    id: 'room_demo',
    name: '🎓 Ôn thi Toán - Lớp 12',
    subject: 'Toán',
    createdBy: 'Teacher',
    members: [
      { id: 'teacher', name: 'Cô Trang', role: 'teacher' },
      { id: state.userName, name: state.userName, role: 'student' }
    ],
    messages: [
      { 
        role: 'ai', 
        content: '👋 Chào mừng đến phòng học Toán! Đây là nơi học tập tập trung, được AI giám sát. Hãy đặt câu hỏi và thảo luận về toán học nhé.', 
        name: 'AI Moderator', 
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) 
      }
    ],
    createdAt: new Date().toLocaleString('vi-VN'),
  };
  state.focusRooms.push(sampleRoom);
  try {
    localStorage.setItem('focusRooms', JSON.stringify(state.focusRooms));
  } catch (error) {
    console.warn('localStorage quota exceeded:', error);
  }
  renderFocusRooms();
}

// ═══════════════════════════════════════
// NAVIGATION & UI
// ═══════════════════════════════════════
function gotoPanel(name, btn) {
  const panels = document.querySelectorAll('.panel');
  const navPills = document.querySelectorAll('.nav-pill');
  
  panels.forEach(p => p.classList.remove('active'));
  navPills.forEach(b => b.classList.remove('active'));
  
  const targetPanel = document.getElementById('panel-' + name);
  if (targetPanel) targetPanel.classList.add('active');
  if (btn) btn.classList.add('active');
  
  // Render focus chat UI when switching to focus chat panel
  if (name === 'focuschat') {
    setTimeout(() => {
      renderFocusRooms();
      renderGradeStats();
      renderRecommendedRooms();
    }, 100);
  }
}

function selectSubj(btn, name, ico, bg) {
  const buttons = document.querySelectorAll('.subj-btn');
  buttons.forEach(b => b.classList.remove('active'));
  
  btn.classList.add('active');
  state.subject = name;
  
  const subjName = getElement('#chat-subj-name');
  const subjIco = getElement('#chat-subj-ico');
  const subjLabel = getElement('#chat-ai-label');
  
  if (subjName) subjName.textContent = name;
  if (subjIco) {
    subjIco.textContent = ico;
    subjIco.style.background = bg;
  }
  if (subjLabel) subjLabel.textContent = 'AI · Sẵn sàng 24/7';
  
  state.chatHistory = [];
}

// ═══════════════════════════════════════
// DASHBOARD ANIMATIONS & ANALYTICS
// ═══════════════════════════════════════
function animateCounter(element, start, end, duration = 1500) {
  if (!element) return;
  
  let current = start;
  const step = Math.ceil((end - start) / (duration / 16));
  let animationFrame = null;
  
  const updateCounter = () => {
    current += step;
    if (current >= end) {
      element.innerText = end;
      if (animationFrame) cancelAnimationFrame(animationFrame);
    } else {
      element.innerText = Math.floor(current);
      animationFrame = requestAnimationFrame(updateCounter);
    }
  };
  
  animationFrame = requestAnimationFrame(updateCounter);
  activeIntervals.push(animationFrame);
}

function animateDashboardCounters() {
  setTimeout(() => {
    const statValues = document.querySelectorAll('.stat-val');
    statValues.forEach((el, idx) => {
      try {
        const text = el.innerText;
        const num = parseInt(text, 10);
        if (!isNaN(num)) {
          animateCounter(el, 0, num, 1500 + idx * 200);
        }
      } catch (error) {
        console.warn('Error animating counter:', error);
      }
    });
  }, 400);
}

function initDashboardInteractions() {
  // Welcome card mouse follow
  const welcomeCard = document.querySelector('.welcome-card');
  if (welcomeCard) {
    welcomeCard.addEventListener('mousemove', handleWelcomeCardMove);
    welcomeCard.addEventListener('mouseenter', handleWelcomeCardEnter);
    welcomeCard.addEventListener('mouseleave', handleWelcomeCardLeave);
  }

  // Pill animation delays
  document.querySelectorAll('.pill').forEach((pill, idx) => {
    pill.style.animationDelay = (idx * 100) + 'ms';
  });

  // Progress bars animation
  document.querySelectorAll('.prog-fill').forEach((fill) => {
    const width = fill.style.width || '75%';
    fill.style.width = '0';
    setTimeout(() => {
      fill.style.width = width;
    }, 200);
  });

  // Schedule items stagger
  document.querySelectorAll('.sch-item').forEach((item, idx) => {
    item.style.animationDelay = (idx * 100) + 'ms';
  });

  // Tips card items stagger
  document.querySelectorAll('.tip-item').forEach((item, idx) => {
    item.style.animationDelay = (idx * 80) + 'ms';
  });
}

function handleWelcomeCardMove(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  e.currentTarget.style.setProperty('--x', x + 'px');
  e.currentTarget.style.setProperty('--y', y + 'px');
}

function handleWelcomeCardEnter(e) {
  e.currentTarget.style.setProperty('--opacity', '1');
}

function handleWelcomeCardLeave(e) {
  e.currentTarget.style.setProperty('--opacity', '0');
}

// ═══════════════════════════════════════
// LEARNING TRACKING & SESSION MANAGEMENT
// ═══════════════════════════════════════
let sessionTrackingInterval = null;

function startSessionTracking() {
  if (!state.sessionStartTime) {
    state.sessionStartTime = Date.now();
    state.sessionMinutesTracked = 0;
  }
  
  // Clear any existing interval to prevent duplicates
  if (sessionTrackingInterval) clearInterval(sessionTrackingInterval);
  
  // Update every 30 seconds
  sessionTrackingInterval = setInterval(() => {
    const now = Date.now();
    const elapsed = Math.floor((now - state.sessionStartTime) / 60000);
    state.sessionMinutesTracked = elapsed;
    updateDashboardStats();
  }, 30000);
  
  activeIntervals.push(sessionTrackingInterval);
  
  // Save session on before unload
  window.addEventListener('beforeunload', saveCurrentSession);
}

function saveCurrentSession() {
  if (state.sessionStartTime && state.sessionMinutesTracked > 1) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const hours = state.sessionMinutesTracked / 60;
      
      let todaySession = state.learning.studySessions.find(s => s.date === today);
      if (!todaySession) {
        todaySession = { date: today, hours: 0, startTime: new Date(), endTime: null };
        state.learning.studySessions.push(todaySession);
        
        if (!state.learning.activeStreakDates.includes(today)) {
          state.learning.activeStreakDates.push(today);
        }
      }
      todaySession.hours += hours;
      todaySession.endTime = new Date();
      
      state.learning.lastSessionDate = today;
      localStorage.setItem('learning_data', JSON.stringify(state.learning));
    } catch (error) {
      console.warn('Error saving session:', error);
    }
  }
}

function getTodayHours() {
  const today = new Date().toISOString().split('T')[0];
  const todaySession = state.learning.studySessions.find(s => s.date === today);
  let hours = todaySession ? todaySession.hours : 0;
  
  if (state.sessionStartTime) {
    const elapsed = Math.floor((Date.now() - state.sessionStartTime) / 60000);
    hours += elapsed / 60;
  }
  return parseFloat(hours.toFixed(1));
}

function getStreak() {
  if (state.learning.activeStreakDates.length === 0) return 0;
  
  const sorted = [...state.learning.activeStreakDates].sort().reverse();
  let streak = 1;
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = new Date(sorted[i]);
    const next = new Date(sorted[i + 1]);
    const diffDays = Math.floor((curr - next) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getTotalAiQuestions() {
  return state.learning.aiQuestions || 0;
}

function getTotalPomodoros() {
  return state.learning.pomodorosCompleted || 0;
}

function updateDashboardStats() {
  try {
    // Update hours
    const hoursEl = document.querySelector('.stat-cards .stat-c:nth-child(1) .stat-val');
    if (hoursEl) {
      const hours = getTodayHours();
      const displayHours = hours > 10 ? hours.toFixed(0) : hours.toFixed(1);
      hoursEl.innerHTML = `<span style="font-size:28px;font-weight:800;color:var(--text)">${displayHours}</span><span style="font-size:16px;color:var(--muted);margin-left:4px">h</span>`;
      
      const percent = Math.min(Math.round((parseFloat(hours) / 6) * 100), 100);
      const progFill = document.querySelector('.stat-cards .stat-c:nth-child(1) .prog-fill');
      const progPercent = document.querySelector('.stat-cards .stat-c:nth-child(1) .prog-lbl span:last-child');
      if (progFill) progFill.style.width = percent + '%';
      if (progPercent) progPercent.textContent = percent + '%';
    }
    
    // Update AI questions
    const aiEl = document.querySelector('.stat-cards .stat-c:nth-child(2) .stat-val');
    if (aiEl) aiEl.textContent = getTotalAiQuestions();
    
    // Update Pomodoros
    const pomoEl = document.querySelector('.stat-cards .stat-c:nth-child(3) .stat-val');
    if (pomoEl) pomoEl.textContent = getTotalPomodoros();
    
    // Update streak
    const streakEl = document.querySelector('.streak-num');
    if (streakEl) streakEl.textContent = getStreak();
    
    // Update Level Bar
    const levelTitle = document.getElementById('level-title');
    const levelXp = document.getElementById('level-xp');
    const levelFill = document.getElementById('level-fill');
    
    if (levelTitle) levelTitle.textContent = `${getCurrentLevelTitle()} · Level ${state.learning.level}`;
    if (levelXp) {
      levelXp.textContent = `${state.learning.totalXP} XP / ${state.learning.level * XP_PER_LEVEL} XP`;
    }
    if (levelFill) levelFill.style.width = getXPProgress() + '%';
    
    // Update Weekly Chart
    setTimeout(() => drawWeeklyChart(), 100);
    
    // Update Weak Subject
    const weakSubj = getWeakestSubjects();
    const weakName = document.getElementById('weak-subject-name');
    const weakDesc = document.getElementById('weak-subject-desc');
    const weakTip = document.getElementById('weak-subject-tip');
    
    if (weakName && weakDesc && weakTip && weakSubj) {
      const percent = Math.round((weakSubj.avgHours / 3.2) * 100);
      weakName.textContent = weakSubj.name;
      weakDesc.textContent = `Tuần này chỉ học ${weakSubj.avgHours} giờ, thấp hơn trung bình ${100 - percent}%`;
      weakTip.innerHTML = `💡 Cố gắng tăng thêm ${Math.max(1.5, 3.2 - weakSubj.avgHours).toFixed(1)} giờ học ${weakSubj.name} tuần sau`;
    }
  } catch (error) {
    console.warn('Error updating dashboard stats:', error);
  }
}

function recordAiQuestion() {
  state.learning.aiQuestions++;
  addXP(5);
  try {
    localStorage.setItem('learning_data', JSON.stringify(state.learning));
  } catch (error) {
    console.warn('Error saving AI question:', error);
  }
  updateDashboardStats();
}

function recordPomodoroComplete() {
  state.learning.pomodorosCompleted++;
  const today = new Date().toISOString().split('T')[0];
  
  if (!state.learning.activeStreakDates.includes(today)) {
    state.learning.activeStreakDates.push(today);
  }
  
  addXP(10);
  try {
    localStorage.setItem('learning_data', JSON.stringify(state.learning));
  } catch (error) {
    console.warn('Error saving pomodoro:', error);
  }
  updateDashboardStats();
}

// ═══════════════════════════════════════
// LEVEL & XP SYSTEM
// ═══════════════════════════════════════
const LEVEL_TITLES = [
  'Newbie Learner', 'Study Starter', 'Book Lover', 'Knowledge Seeker', 'Smart Student',
  'Math Warrior', 'Science Master', 'Quiz Champion', 'Genius Level', 'Study Legend'
];

const XP_PER_LEVEL = 100;

function addXP(amount) {
  if (amount <= 0 || !Number.isInteger(amount)) return;
  state.learning.totalXP += amount;
  checkLevelUp();
}

function checkLevelUp() {
  const newLevel = Math.floor(state.learning.totalXP / XP_PER_LEVEL) + 1;
  if (newLevel > state.learning.level) {
    state.learning.level = newLevel;
    showLevelUpNotif(newLevel);
  }
}

function showLevelUpNotif(level) {
  const levelDiv = document.querySelector('.level-bar');
  if (levelDiv) {
    levelDiv.style.animation = 'none';
    setTimeout(() => {
      levelDiv.style.animation = 'pulse 0.5s ease-in-out';
    }, 10);
  }
}

function getCurrentLevelTitle() {
  const index = Math.min(state.learning.level - 1, LEVEL_TITLES.length - 1);
  return LEVEL_TITLES[index];
}

function getCurrentLevelXP() {
  return state.learning.totalXP;
}

function getXPForNextLevel() {
  return (state.learning.level * XP_PER_LEVEL) - state.learning.totalXP;
}

function getXPProgress() {
  const levelStart = (state.learning.level - 1) * XP_PER_LEVEL;
  const levelEnd = state.learning.level * XP_PER_LEVEL;
  const currentInLevel = state.learning.totalXP - levelStart;
  const maxInLevel = levelEnd - levelStart;
  return Math.min(Math.floor((currentInLevel / maxInLevel) * 100), 100);
}

// ═══════════════════════════════════════
// ANALYTICS & CHART
// ═══════════════════════════════════════
function getWeeklyData() {
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const session = state.learning.studySessions.find(s => s.date === dateStr);
    const hours = session ? Math.max(0, parseFloat(session.hours)) : 0;
    week.push({ 
      date: dateStr, 
      hours: hours, 
      dayName: ['CN','T2','T3','T4','T5','T6','T7'][date.getDay()] 
    });
  }
  return week;
}

function getWeakestSubjects() {
  const subjects = [
    { name: 'Vật lý', avgHours: 1.5, streak: 2 },
    { name: 'Hóa học', avgHours: 2.1, streak: 3 },
    { name: 'Toán học', avgHours: 3.2, streak: 5 },
    { name: 'Tiếng Anh', avgHours: 1.2, streak: 1 }
  ];
  return subjects.reduce((min, subj) => subj.avgHours < min.avgHours ? subj : min);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function updateChartStats(data) {
  const totalHours = data.reduce((sum, d) => sum + d.hours, 0);
  const avgHours = totalHours / 7;
  
  // Calculate previous week
  const prevWeekData = [];
  for (let i = 13; i >= 7; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const entry = state.learning.studySessions.find(s => s.date === dateStr);
    prevWeekData.push({ date: dateStr, hours: entry ? entry.totalMinutes / 60 : 0 });
  }
  const prevTotalHours = prevWeekData.reduce((sum, d) => sum + d.hours, 0);
  const percentChange = prevTotalHours > 0 ? ((totalHours - prevTotalHours) / prevTotalHours * 100).toFixed(0) : 0;
  
  // Update DOM elements
  document.getElementById('chart-total-hours').textContent = totalHours.toFixed(1);
  document.getElementById('stat-total').textContent = totalHours.toFixed(1) + ' giờ';
  document.getElementById('stat-average').textContent = avgHours.toFixed(1) + ' giờ/ngày';
  
  const comparisonEl = document.getElementById('stat-comparison');
  const descEl = document.getElementById('stat-comparison-desc');
  const insightEl = document.getElementById('chart-insight');
  
  if (percentChange >= 20) {
    comparisonEl.textContent = '+' + percentChange + '%';
    comparisonEl.style.color = '#00D97E';
    descEl.textContent = 'tổng so với tuần trước';
  } else if (percentChange > 0) {
    comparisonEl.textContent = '+' + percentChange + '%';
    comparisonEl.style.color = '#00D97E';
    descEl.textContent = 'tổng so với tuần trước';
  } else if (percentChange < 0) {
    comparisonEl.textContent = percentChange + '%';
    comparisonEl.style.color = '#FF6B6B';
    descEl.textContent = 'tổng so với tuần trước';
  } else {
    comparisonEl.textContent = '=';
    comparisonEl.style.color = 'rgba(255,255,255,0.6)';
    descEl.textContent = 'không thay đổi';
  }
  
  // Generate insight
  let insight = '';
  if (percentChange >= 20) {
    insight = '🔥 Bạn học nhiều hơn tuần trước ' + percentChange + '%!';
  } else if (percentChange > 0) {
    insight = '📈 Tiến bộ tốt, tăng ' + percentChange + '% so với tuần trước.';
  } else if (percentChange < 0) {
    insight = '📉 Giảm ' + Math.abs(percentChange) + '% so với tuần trước. Cộng thêm thời gian học!';
  } else {
    insight = '⏸️ Luyện tập ổn định như tuần trước.';
  }
  
  const bestDay = data.reduce((max, d) => d.hours > max.hours ? d : max, data[0]);
  if (bestDay.hours > 0) {
    insight += ' Ngày tốt nhất: ' + bestDay.dayName + ' (' + bestDay.hours.toFixed(1) + 'h)';
  }
  
  if (insightEl) {
    insightEl.textContent = insight;
  }
}

function drawWeeklyChart() {
  const canvas = document.getElementById('weekly-chart');
  if (!canvas) return;
  
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Ensure canvas has proper dimensions
    if (!canvas.width || !canvas.height) {
      canvas.width = 700;
      canvas.height = 300;
    }
    
    const data = getWeeklyData();
    const maxHours = Math.max(...data.map(d => d.hours), 6);
    
    const padding = 60;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const barWidth = chartWidth / 7;
    const barActualWidth = 18;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Y-axis labels (0, 2, 4, 6h) with reduced grid
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px DM Sans';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 6; i += 2) {
      const y = canvas.height - padding - (i / maxHours) * chartHeight;
      ctx.fillText(i + 'h', padding - 15, y + 4);
      
      // Grid lines - only for 0, 2, 4, 6
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();
    }
    
    // Draw bars with gradient and glow
    const today = new Date().toISOString().split('T')[0];
    
    data.forEach((d, idx) => {
      const barHeight = (d.hours / maxHours) * chartHeight;
      const x = padding + idx * barWidth + (barWidth - barActualWidth) / 2;
      const y = canvas.height - padding - barHeight;
      
      const isToday = d.date === today;
      
      // Gradient for bar
      const grad = ctx.createLinearGradient(0, y, 0, canvas.height - padding);
      if (isToday) {
        grad.addColorStop(0, '#4F8CFF');
        grad.addColorStop(1, '#1F4EFF');
      } else {
        grad.addColorStop(0, '#2563eb');
        grad.addColorStop(1, '#1e40af');
      }
      
      ctx.fillStyle = grad;
      
      // Draw bar with rounded corners
      roundRect(ctx, x, y, barActualWidth, barHeight, 6);
      ctx.fill();
      
      // Glow effect for today
      if (isToday && d.hours > 0) {
        ctx.shadowColor = 'rgba(79, 140, 255, 0.5)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        roundRect(ctx, x - 1, y - 1, barActualWidth + 2, barHeight + 2, 6);
        ctx.stroke();
        ctx.shadowColor = 'transparent';
      }
    });
    
    // Draw day labels
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 12px DM Sans';
    ctx.textAlign = 'center';
    
    data.forEach((d, idx) => {
      const x = padding + idx * barWidth + barWidth / 2;
      const isTodayLabel = d.date === today;
      
      if (isTodayLabel) {
        ctx.fillStyle = '#4F8CFF';
        ctx.font = 'bold 13px DM Sans';
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '12px DM Sans';
      }
      
      ctx.fillText(d.dayName, x, canvas.height - padding + 25);
      
      // Value label
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '11px DM Sans';
      ctx.fillText(d.hours.toFixed(1) + 'h', x, canvas.height - padding + 40);
      
      // Today badge
      if (isTodayLabel) {
        ctx.fillStyle = 'rgba(79, 140, 255, 0.2)';
        ctx.fillRect(x - 20, canvas.height - padding + 42, 40, 14);
        ctx.fillStyle = '#4F8CFF';
        ctx.font = '9px DM Sans';
        ctx.fillText('Hôm nay', x, canvas.height - padding + 53);
      }
    });
    
    // Update stats
    updateChartStats(data);
  } catch (error) {
    console.warn('Error drawing chart:', error);
  }
}
