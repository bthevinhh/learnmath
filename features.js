/**
 * StudyMate AI - FEATURES MODULE (OPTIMIZED)
 * Manages: Schedule generation, Pomodoro timer
 */

// ═══════════════════════════════════════
// AUTO SCHEDULE
// ═══════════════════════════════════════
async function generateSchedule() {
  const modal = document.getElementById('schedule-modal');
  const topicsEl = document.getElementById('schedule-topics');
  const btnGen = document.querySelector('[onclick="generateSchedule()"]');
  const contentEl = document.getElementById('schedule-content');

  if (!topicsEl || !modal || !btnGen) return;
  
  const topics = topicsEl.value.trim();
  if (!topics) {
    alert('Nhập chủ đề học tập rồi generate nhé!');
    return;
  }

  if (modal) modal.style.display = 'flex';
  btnGen.disabled = true;
  btnGen.textContent = '⏳ Đang tạo...';

  const prompt = `Tạo lịch học tập chi tiết cho học sinh học ${state.subject}.
Chủ đề: ${topics}
Yêu cầu:
1. Lập kế hoạch từ 3-5 ngày
2. Mỗi ngày 2-3 session, mỗi session 45 phút
3. Thêm breaktime (10 phút) giữa các session
4. Phân chia các chủ đề hợp lý
5. Trả về HTML table đơn giản, không dùng CSS phức tạp

Format: <table style="width:100%; border-collapse:collapse"><tr><td style="border:1px solid #ddd;padding:8px">...</td>...

Lịch học chi tiết:`;

  try {
    const reply = await callAI(prompt);
    if (contentEl) contentEl.innerHTML = reply;
  } catch (error) {
    if (contentEl) contentEl.innerHTML = `<div style="color:red">❌ Lỗi: ${error.message}</div>`;
  } finally {
    btnGen.disabled = false;
    btnGen.textContent = '📅 Tạo lịch học';
  }
}

// ═══════════════════════════════════════
// POMODORO TIMER
// ═══════════════════════════════════════
const MODES = {
  work: { label: 'Làm bài', color: '#4F8CFF', glowColor: '#4F8CFF', duration: 25 * 60 },
  break: { label: 'Nghỉ ngơi', color: '#00D97E', glowColor: '#00D97E', duration: 5 * 60 },
  long: { label: 'Nghỉ dài', color: '#9B6BFF', glowColor: '#9B6BFF', duration: 15 * 60 }
};

let pMode = 'work';
let pLeft = MODES.work.duration;
let pTotalDuration = MODES.work.duration;
let pRunning = false;
let pInterval = null;
let pTimingAnimationId = null;

function initPomodoro() {
  const ringTime = document.getElementById('ring-time');
  if (ringTime) {
    ringTime.textContent = formatTime(pLeft);
    ringTime.style.color = MODES[pMode].color;
  }
  const ringLbl = document.getElementById('ring-lbl');
  if (ringLbl) ringLbl.textContent = MODES[pMode].label;
  updateRingGradient();
  updatePomoProgress();
  updatePomoStats();
  updatePomoDisplay();
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

function setMode(mode) {
  if (pRunning || !MODES[mode]) return;
  
  pMode = mode;
  if (mode === 'work') {
    const customInput = document.getElementById('pomo-duration');
    let customMinutes = customInput ? parseInt(customInput.value, 10) : 25;
    if (isNaN(customMinutes) || customMinutes < 1 || customMinutes > 120) customMinutes = 25;
    pLeft = customMinutes * 60;
    pTotalDuration = customMinutes * 60;
  } else {
    pLeft = MODES[mode].duration;
    pTotalDuration = MODES[mode].duration;
  }
  // Update display elements
  const ringTime = document.getElementById('ring-time');
  if (ringTime) {
    ringTime.textContent = formatTime(pLeft);
    ringTime.style.color = MODES[mode].color;
    ringTime.style.animation = 'none';
    setTimeout(() => ringTime.style.animation = '', 10);
  }
  const ringLbl = document.getElementById('ring-lbl');
  if (ringLbl) ringLbl.textContent = MODES[mode].label;
  updateRingGradient();
  updatePomoDisplay();
}

function togglePomo() {
  if (!pRunning) {
    pRunning = true;
    // Clear any existing interval
    if (pInterval) clearInterval(pInterval);
    // If starting a work session, use custom duration
    if (pMode === 'work') {
      const customInput = document.getElementById('pomo-duration');
      let customMinutes = customInput ? parseInt(customInput.value, 10) : 25;
      if (isNaN(customMinutes) || customMinutes < 1 || customMinutes > 120) customMinutes = 25;
      pLeft = customMinutes * 60;
    }
    pInterval = setInterval(() => {
      pLeft--;
      // Update ring-time display with animation
      const ringTime = document.getElementById('ring-time');
      if (ringTime) {
        ringTime.textContent = formatTime(pLeft);
        // Pulse animation on number change
        ringTime.style.transform = 'scale(0.95)';
        setTimeout(() => ringTime.style.transform = 'scale(1)', 100);
      }
      // Update progress bar and glow effect
      updatePomoProgress();
      updateRingGradient();
      
      if (pLeft <= 0) {
        clearInterval(pInterval);
        pRunning = false;
        playDoneSound();
        // Record completed pomodoro if it was a work session
        if (pMode === 'work') {
          recordPomodoroComplete();
        }
        const next = pMode === 'work' ? 'break' : pMode === 'break' ? 'long' : 'work';
        const msg = `${MODES[pMode].label} xong! Hãy ${MODES[next].label}. Bấm để tiếp tục.`;
        alert(msg);
        setMode(next);
      }
    }, 1000);
  } else {
    clearInterval(pInterval);
    pRunning = false;
  }
  updatePomoDisplay();
}

function resetPomo() {
  if (pRunning && pInterval) {
    clearInterval(pInterval);
    pRunning = false;
  }
  if (pMode === 'work') {
    const customInput = document.getElementById('pomo-duration');
    let customMinutes = customInput ? parseInt(customInput.value, 10) : 25;
    if (isNaN(customMinutes) || customMinutes < 1 || customMinutes > 120) customMinutes = 25;
    pLeft = customMinutes * 60;
    pTotalDuration = customMinutes * 60;
  } else {
    pLeft = MODES[pMode].duration;
    pTotalDuration = MODES[pMode].duration;
  }
  const ringTime = document.getElementById('ring-time');
  if (ringTime) ringTime.textContent = formatTime(pLeft);
  updatePomoProgress();
  updateRingGradient();
  updatePomoDisplay();
}

function updatePomoDisplay() {
  const modeColor = MODES[pMode].color;
  const modeLabel = MODES[pMode].label;
  const playBtn = document.getElementById('pomo-start-btn');
  const ringTime = document.getElementById('ring-time');
  const ringLbl = document.getElementById('ring-lbl');

  // Update time display color
  if (ringTime) ringTime.style.color = modeColor;
  
  // Update label
  if (ringLbl) ringLbl.textContent = modeLabel;
  
  // Update mode tabs styling
  document.querySelectorAll('.mode-tab').forEach(el => {
    const isActive = (el.textContent.includes('Tập trung') && pMode === 'work') ||
                     (el.textContent.includes('Nghỉ ngắn') && pMode === 'break') ||
                     (el.textContent.includes('Nghỉ dài') && pMode === 'long');
    el.style.backgroundColor = isActive ? modeColor : 'rgba(255,255,255,.05)';
    el.style.color = isActive ? '#fff' : 'var(--text2)';
  });

  if (playBtn) {
    if (pRunning) {
      playBtn.textContent = '⏸ Tạm dừng';
      playBtn.style.backgroundColor = '#fbbf24';
    } else {
      playBtn.textContent = '▶ Bắt đầu';
      playBtn.style.backgroundColor = modeColor;
    }
  }
}

function playDoneSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    osc.start(audioContext.currentTime);
    osc.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.warn('Error playing sound:', error);
  }
}

function updateRingGradient() {
  // Update SVG gradient based on current mode
  const gradient = document.getElementById('rg');
  if (gradient) {
    const color = MODES[pMode].color;
    const stops = gradient.querySelectorAll('stop');
    if (stops[0]) stops[0].setAttribute('style', `stop-color:${color}`);
    if (stops[1]) stops[1].setAttribute('style', `stop-color:${color};stop-opacity:0.6`);
  }
  
  // Update ring background
  const ringProg = document.getElementById('ring-prog');
  if (ringProg) {
    if (pRunning && pLeft <= 60) {
      // Glow effect when < 1 minute left
      ringProg.style.filter = `drop-shadow(0 0 20px ${MODES[pMode].glowColor})`;
    } else {
      ringProg.style.filter = 'none';
    }
  }
  
  // Update ring-wrap with subtle glow
  const ringWrap = document.querySelector('.ring-wrap');
  if (ringWrap) {
    if (pRunning && pLeft <= 60) {
      ringWrap.style.boxShadow = `0 0 40px rgba(${hexToRgb(MODES[pMode].glowColor)}, 0.3)`;
    } else {
      ringWrap.style.boxShadow = 'none';
    }
  }
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
}

function updatePomoProgress() {
  // Update progress bar and percentage
  const progress = (pTotalDuration - pLeft) / pTotalDuration * 100;
  const progressEl = document.getElementById('pomo-progress');
  const percentEl = document.getElementById('pomo-percent');
  
  if (progressEl) {
    progressEl.style.backgroundColor = MODES[pMode].color;
    progressEl.style.width = progress + '%';
  }
  if (percentEl) {
    percentEl.textContent = Math.round(progress) + '%';
    percentEl.style.color = MODES[pMode].color;
  }
}

function updatePomoStats() {
  // Update Streak, Level, XP display
  const streakEl = document.getElementById('pomo-streak');
  const levelEl = document.getElementById('pomo-level');
  const xpValEl = document.getElementById('pomo-xp-val');
  
  if (streakEl) streakEl.textContent = getStreak() || 0;
  if (levelEl) levelEl.textContent = state.learning.level || 1;
  if (xpValEl) xpValEl.textContent = state.learning.totalXP || 0;
}

function skipPomo() {
  if (!pRunning) {
    // If not running, just switch to next mode
    const next = pMode === 'work' ? 'break' : pMode === 'break' ? 'long' : 'work';
    setMode(next);
  } else {
    // If running, skip current session
    if (pInterval) clearInterval(pInterval);
    pRunning = false;
    const next = pMode === 'work' ? 'break' : pMode === 'break' ? 'long' : 'work';
    setMode(next);
    updatePomoDisplay();
  }
}

function recordPomodoroComplete() {
  if (!state.learning) state.learning = createDefaultLearningData();
  state.learning.pomodorosCompleted++;
  
  // XP System: 1 Pomodoro = 10 XP, Bonus every 5 pomodoros
  addXP(10);
  
  // Bonus: Every 5 pomodoros = +50 XP
  if (state.learning.pomodorosCompleted % 5 === 0) {
    addXP(50);
    const msgEl = document.getElementById('chat-msgs');
    if (msgEl && typeof addSystemMsg === 'function') {
      addSystemMsg(`🎉 Bonus! +50 XP vì hoàn thành 5 pomodoros!`);
    }
  }
  
  updatePomoStats();
  saveLearningData();
}

function addXP(amount) {
  if (!state.learning) state.learning = createDefaultLearningData();
  state.learning.totalXP = (state.learning.totalXP || 0) + amount;
  
  // Level up every 300 XP
  const xpPerLevel = 300;
  const newLevel = Math.floor(state.learning.totalXP / xpPerLevel) + 1;
  if (newLevel > state.learning.level) {
    state.learning.level = newLevel;
    const msgEl = document.getElementById('chat-msgs');
    if (msgEl && typeof addSystemMsg === 'function') {
      addSystemMsg(`🎊 Nâng cấp lên Level ${newLevel}!`);
    }
  }
  
  saveLearningData();
  updatePomoStats();
}

function saveLearningData() {
  try {
    localStorage.setItem('learning_data', JSON.stringify(state.learning));
  } catch (error) {
    console.warn('Error saving learning data:', error);
  }
}

function getStreak() {
  if (!state.learning || !state.learning.activeStreakDates) return 0;
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
