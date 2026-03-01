/**
 * StudyMate AI - ZOOM STYLE VIDEO ROOM
 * v3.0 - Focus Mode, AI Panel, Host Controls
 */

// ═══════════════════════════════════════
// ROOM STATE
// ═══════════════════════════════════════
let roomState = {
  roomId: null,
  roomName: '',
  subject: '',
  isFocusMode: false,
  focusTimeLeft: 0, // seconds
  focusInterval: null,
  focusTimerDisplay: 25, // 25 min default
  isHost: true,
  myMicOn: false,
  myCamOn: false,
  participants: [], // {id, name, cam, mic, isHost}
  chatMessages: [],
  focusModeStartTime: null,
  allowCam: true,
  allowMic: true,
  autoMuteOnFocus: true
};

// Dummy participants for demo
const DEMO_PARTICIPANTS = [
  { id: 'user_1', name: 'Bạn', avatar: '👤', isHost: true },
  { id: 'user_2', name: 'Huy', avatar: '👨', isHost: false },
  { id: 'user_3', name: 'Lan', avatar: '👩', isHost: false },
  { id: 'user_4', name: 'Minh', avatar: '👨', isHost: false }
];

// ═══════════════════════════════════════
// ROOM INITIALIZATION
// ═══════════════════════════════════════
function initializeVideoRoom(roomData) {
  roomState.roomId = roomData.id;
  roomState.roomName = roomData.name;
  roomState.subject = roomData.subject;
  roomState.allowCam = roomData.allowCam !== false;
  roomState.allowMic = roomData.allowMic !== false;
  
  // Demo: Add participants
  roomState.participants = DEMO_PARTICIPANTS.map(p => ({
    ...p,
    cam: Math.random() > 0.3, // 70% chance cam on
    mic: Math.random() > 0.5  // 50% chance mic on
  }));
  
  renderVideoRoom();
}

// ═══════════════════════════════════════
// CAMERA CONTROLS
// ═══════════════════════════════════════
function toggleMyCam() {
  if (!roomState.allowCam) {
    alert('📹 Chủ phòng không cho phép bật camera');
    return;
  }
  
  roomState.myCamOn = !roomState.myCamOn;
  roomState.participants[0].cam = roomState.myCamOn;
  renderVideoGrid();
  
  const btn = document.getElementById('room-cam-btn');
  if (btn) {
    btn.style.background = roomState.myCamOn ? '#ef4444' : 'rgba(239,68,68,.1)';
    btn.innerHTML = roomState.myCamOn ? '📹 Tắt camera' : '📹 Bật camera';
  }
}

function toggleMyMic() {
  if (!roomState.allowMic) {
    alert('🎙 Chủ phòng không cho phép bật mic');
    return;
  }
  
  if (roomState.isFocusMode && !roomState.isHost) {
    alert('🔇 Focus Mode: Chỉ host có thể nói');
    roomState.myMicOn = false;
    return;
  }
  
  roomState.myMicOn = !roomState.myMicOn;
  roomState.participants[0].mic = roomState.myMicOn;
  renderVideoGrid();
  
  const btn = document.getElementById('room-mic-btn');
  if (btn) {
    btn.style.background = roomState.myMicOn ? '#ef4444' : 'rgba(239,68,68,.1)';
    btn.innerHTML = roomState.myMicOn ? '🎙 Tắt mic' : '🎙 Bật mic';
  }
}

// ═══════════════════════════════════════
// FOCUS MODE
// ═══════════════════════════════════════
function startFocusSession() {
  if (!roomState.isHost) {
    alert('👑 Chỉ host có thể bắt đầu Focus Mode');
    return;
  }
  
  roomState.isFocusMode = true;
  roomState.focusTimeLeft = roomState.focusModeStartTime * 60; // Convert to seconds
  roomState.focusModeStartTime = Date.now();
  
  // Auto-mute non-host participants
  if (roomState.autoMuteOnFocus) {
    roomState.participants.forEach(p => {
      if (!p.isHost) p.mic = false;
    });
  }
  
  // Disable cam/mic for participants
  if (!roomState.isHost) {
    roomState.myCamOn = false;
    roomState.myMicOn = false;
  }
  
  renderVideoGrid();
  renderFocusBar();
  
  // Start timer
  clearInterval(roomState.focusInterval);
  roomState.focusInterval = setInterval(() => {
    roomState.focusTimeLeft--;
    if (roomState.focusTimeLeft <= 0) {
      endFocusSession();
    }
    renderFocusBar();
    renderChatPanel();
  }, 1000);
  
  const btn = document.getElementById('room-focus-btn');
  if (btn) {
    btn.innerHTML = '⏹ Kết thúc Focus';
    btn.style.background = '#ef4444';
  }
}

function endFocusSession() {
  roomState.isFocusMode = false;
  clearInterval(roomState.focusInterval);
  roomState.focusTimeLeft = 0;
  
  // Re-enable controls
  renderVideoGrid();
  renderFocusBar();
  
  const btn = document.getElementById('room-focus-btn');
  if (btn) {
    btn.innerHTML = '🎯 Start Focus';
    btn.style.background = '';
  }
  
  alert('✅ Focus Session kết thúc! Giỏi lắm!');
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function renderFocusBar() {
  const focusBar = document.getElementById('room-focus-bar');
  if (!focusBar) return;
  
  if (!roomState.isFocusMode) {
    focusBar.innerHTML = '';
    focusBar.style.display = 'none';
    return;
  }
  
  focusBar.style.display = 'flex';
  focusBar.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;width:100%;justify-content:center;">
      <span style="font-size:14px;font-weight:600;color:#ef4444;">🔴 FOCUS MODE</span>
      <span style="font-size:18px;font-weight:700;color:#fff;font-family:monospace;">${formatTime(roomState.focusTimeLeft)}</span>
    </div>
  `;
}

// ═══════════════════════════════════════
// VIDEO GRID RENDERING
// ═══════════════════════════════════════
function renderVideoGrid() {
  const grid = document.getElementById('room-video-grid');
  if (!grid) return;
  
  const videoCount = roomState.participants.length;
  const cols = Math.ceil(Math.sqrt(videoCount));
  
  grid.style.gridTemplateColumns = `repeat(${Math.min(cols, 3)}, 1fr)`;
  
  grid.innerHTML = roomState.participants.map(p => `
    <div style="
      position:relative;
      background:linear-gradient(135deg,rgba(79,142,247,.1),rgba(167,139,250,.1));
      border:2px solid ${p.id === 'user_1' ? 'var(--accent)' : 'var(--border)'};
      border-radius:12px;
      padding:16px;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
      gap:12px;
      min-height:200px;
      cursor:pointer;
      transition:all .3s;
    " onmouseover="this.style.boxShadow='0 0 20px rgba(79,142,247,.3)'" onmouseout="this.style.boxShadow=''">
      <!-- Avatar / Video -->
      <div style="
        font-size:64px;
        background:rgba(79,142,247,.15);
        border-radius:12px;
        width:100px;
        height:100px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:700;
      ">
        ${p.cam ? '📹' : p.avatar}
      </div>
      
      <!-- Name -->
      <div style="
        font-size:14px;
        font-weight:600;
        color:var(--text);
      ">
        ${p.name} ${p.isHost ? '👑' : ''}
      </div>
      
      <!-- Status indicators -->
      <div style="display:flex;gap:8px;justify-content:center;">
        <span style="
          padding:4px 8px;
          background:${p.mic ? 'rgba(34,197,94,.2)' : 'rgba(239,68,68,.2)'};
          color:${p.mic ? '#22c55e' : '#ef4444'};
          border-radius:4px;
          font-size:11px;
          font-weight:600;
        ">
          ${p.mic ? '🎙 On' : '🔇 Off'}
        </span>
        <span style="
          padding:4px 8px;
          background:${p.cam ? 'rgba(34,197,94,.2)' : 'rgba(239,68,68,.2)'};
          color:${p.cam ? '#22c55e' : '#ef4444'};
          border-radius:4px;
          font-size:11px;
          font-weight:600;
        ">
          ${p.cam ? '📹 On' : '📹 Off'}
        </span>
      </div>
    </div>
  `).join('');
}

// ═══════════════════════════════════════
// CHAT PANEL
// ═══════════════════════════════════════
function sendRoomMessage() {
  const input = document.getElementById('room-chat-input');
  const text = input?.value.trim();
  
  if (!text) return;
  
  if (roomState.isFocusMode && !roomState.isHost) {
    alert('🔇 Focus Mode: Chỉ host có thể chat');
    return;
  }
  
  const message = {
    id: Date.now(),
    sender: 'Bạn',
    text: text,
    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    isHost: roomState.isHost
  };
  
  roomState.chatMessages.push(message);
  if (input) input.value = '';
  renderChatPanel();
  
  // AI check content
  setTimeout(() => {
    checkAIContent(text);
  }, 500);
}

function checkAIContent(text) {
  const aiPanel = document.getElementById('room-ai-panel');
  if (!aiPanel) return;
  
  const isOffTopic = !text.toLowerCase().match(
    /toán|lý|hóa|sinh|anh|sử|địa|câu hỏi|giúp|làm|bài|học|công thức|định lý/i
  );
  
  if (isOffTopic && roomState.isFocusMode) {
    const warning = document.createElement('div');
    warning.style.cssText = `
      padding:12px;
      background:rgba(239,68,68,.15);
      border:1px solid rgba(239,68,68,.3);
      border-radius:8px;
      color:#ef4444;
      font-size:12px;
      margin-bottom:8px;
      animation:slideIn .3s ease;
    `;
    warning.innerHTML = '⚠️ <strong>Nhắc nhở:</strong> Hãy tập trung vào bài học!';
    aiPanel.prepend(warning);
    
    setTimeout(() => warning.remove(), 3000);
  }
}

function renderChatPanel() {
  const chatBox = document.getElementById('room-chat-box');
  if (!chatBox) return;
  
  chatBox.innerHTML = roomState.chatMessages.map(m => `
    <div style="
      padding:8px;
      margin-bottom:8px;
      background:${m.isHost ? 'rgba(79,142,247,.1)' : 'rgba(167,139,250,.1)'};
      border-radius:6px;
      border-left:3px solid ${m.isHost ? 'var(--accent)' : 'var(--accent2)'};
      font-size:12px;
    ">
      <div style="font-weight:600;color:var(--text);margin-bottom:2px;">
        ${m.sender} ${m.isHost ? '👑' : ''}
        <span style="color:var(--muted2);font-size:10px;margin-left:4px;">${m.time}</span>
      </div>
      <div style="color:var(--text);word-break:break-word;">${escapeHtml(m.text)}</div>
    </div>
  `).join('');
  
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ═══════════════════════════════════════
// AI PANEL
// ═══════════════════════════════════════
function renderAIPanel() {
  const panel = document.getElementById('room-ai-panel');
  if (!panel) return;
  
  const hints = [
    '💡 Gợi ý: Bạn nên tiếp tục làm câu 3',
    '⏱ Nhắc nhở: Dành 5 phút nữa cho câu này',
    '🎯 Focus: Bạn đang học rất tốt!',
    '📊 Tiến độ: 60% của bài hôm nay',
    '✨ Thành tích: Tuần này học 3h, giỏi lắm!'
  ];
  
  const randomHint = hints[Math.floor(Math.random() * hints.length)];
  
  panel.innerHTML = `
    <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px;">
      🤖 AI Gợi Ý
    </div>
    <div style="
      padding:12px;
      background:rgba(59,130,246,.1);
      border:1px solid rgba(59,130,246,.3);
      border-radius:8px;
      font-size:12px;
      color:var(--text);
      line-height:1.5;
    ">
      ${randomHint}
    </div>
    <div style="
      padding:12px;
      background:rgba(168,85,247,.1);
      border:1px solid rgba(168,85,247,.3);
      border-radius:8px;
      font-size:12px;
      color:var(--text);
      line-height:1.5;
      margin-top:8px;
    ">
      📚 <strong>Bài hôm nay:</strong><br/>
      Chuyên đề: ${roomState.subject}
    </div>
  `;
}

// ═══════════════════════════════════════
// MEMBERS PANEL
// ═══════════════════════════════════════
function renderMembersPanel() {
  const panel = document.getElementById('room-members-panel');
  if (!panel) return;
  
  panel.innerHTML = `
    <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:12px;">
      👥 Thành viên (${roomState.participants.length})
    </div>
    ${roomState.participants.map(p => `
      <div style="
        display:flex;
        align-items:center;
        justify-content:space-between;
        padding:8px;
        margin-bottom:6px;
        background:var(--surface2);
        border-radius:6px;
        font-size:12px;
      ">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:16px;">${p.avatar}</span>
          <div>
            <div style="font-weight:600;">${p.name} ${p.isHost ? '👑' : ''}</div>
            <div style="color:var(--muted2);font-size:10px;">
              ${p.mic ? '✓ Mic' : '-'} ${p.cam ? '✓ Cam' : '-'}
            </div>
          </div>
        </div>
        ${roomState.isHost && !p.isHost ? `
          <button onclick="kickMember('${p.id}')" style="
            border:none;
            background:transparent;
            color:var(--danger);
            cursor:pointer;
            font-size:12px;
          " title="Kick">✕</button>
        ` : ''}
      </div>
    `).join('')}
  `;
}

function kickMember(memberId) {
  if (!confirm('Kick thành viên này?')) return;
  roomState.participants = roomState.participants.filter(p => p.id !== memberId);
  renderMembersPanel();
  renderVideoGrid();
}

function muteAllMembers() {
  if (!roomState.isHost) return;
  roomState.participants.forEach(p => {
    if (!p.isHost) p.mic = false;
  });
  renderVideoGrid();
}

// ═══════════════════════════════════════
// MAIN RENDER
// ═══════════════════════════════════════
function renderVideoRoom() {
  const container = document.getElementById('video-room-container');
  if (!container) return;
  
  container.style.display = 'flex';
  
  // Update room header
  const nameEl = document.getElementById('room-name-display');
  const subjectEl = document.getElementById('room-subject-display');
  if (nameEl) nameEl.innerHTML = roomState.roomName || '- -';
  if (subjectEl) subjectEl.innerHTML = '📚 ' + (roomState.subject || 'Toán');
  
  renderVideoGrid();
  renderFocusBar();
  renderChatPanel();
  renderAIPanel();
  renderMembersPanel();
}

function exitVideoRoom() {
  if (confirm('Rời khỏi phòng?')) {
    clearInterval(roomState.focusInterval);
    document.getElementById('video-room-container').style.display = 'none';
    document.getElementById('panel-focuschat').style.display = 'flex';
    selectFocusRoom(null);
  }
}
