/**
 * StudyMate AI - FOCUS CHAT MODULE (OPTIMIZED)
 * Manages: Focus Chat rooms, AI Moderator, Analytics, Grade Selection
 * v2.2 - Filter, Smart Recommendations, Grade Stats
 */

// ═══════════════════════════════════════
// STATE & FILTERS
// ═══════════════════════════════════════
let focusFilterGrade = null; // null = show all, or specific grade
let focusFilterSubject = null; // null = show all, or specific subject
let focusFilterSearch = ''; // search by room name

// ═══════════════════════════════════════
// FOCUS CHAT UI - WITH GRADE SUPPORT
// ═══════════════════════════════════════
function openFocusModal() {
  const modal = document.getElementById('fc-modal-overlay');
  const input = document.getElementById('fc-room-name');
  if (modal) modal.style.display = 'flex';
  if (input) input.focus();
}

function closeFocusModal() {
  const modal = document.getElementById('fc-modal-overlay');
  const input = document.getElementById('fc-room-name');
  const gradeSelect = document.getElementById('fc-room-grade');
  if (modal) modal.style.display = 'none';
  if (input) input.value = '';
  if (gradeSelect) gradeSelect.value = '10';
}

// Advanced room creation modal
function openAdvancedRoomModal() {
  const modal = document.getElementById('advanced-room-modal');
  if (modal) modal.style.display = 'flex';
}

function closeAdvancedRoomModal() {
  const modal = document.getElementById('advanced-room-modal');
  if (modal) modal.style.display = 'none';
}

function createAdvancedRoom() {
  const nameInput = document.getElementById('adv-room-name');
  const subjectInput = document.getElementById('adv-room-subject');
  const focusTimeInput = document.getElementById('adv-room-focus-time');
  const allowCamInput = document.getElementById('adv-room-allow-cam');
  const allowMicInput = document.getElementById('adv-room-allow-mic');
  
  const name = nameInput?.value.trim();
  const subject = subjectInput?.value || 'Toán';
  const focusTime = parseInt(focusTimeInput?.value) || 25;
  const allowCam = allowCamInput?.checked || true;
  const allowMic = allowMicInput?.checked || true;
  
  if (!name || name.length > 50) {
    alert('Tên phòng phải từ 1-50 ký tự');
    return;
  }
  
  closeAdvancedRoomModal();
  
  // Create room data
  const roomData = {
    id: Date.now(),
    name,
    subject,
    focusTime,
    allowCam,
    allowMic,
    isVideoRoom: true // Mark as video room
  };
  
  // Initialize and launch video room
  setTimeout(() => {
    initializeVideoRoom(roomData);
    document.getElementById('panel-focuschat').style.display = 'none';
    document.getElementById('video-room-container').style.display = 'flex';
  }, 100);
}

function setGradeFilter(grade) {
  focusFilterGrade = grade === null || grade === 'null' || grade === '' ? null : grade;
  renderFocusRooms();
}

function setSubjectFilter(subject) {
  focusFilterSubject = subject === null || subject === 'null' || subject === '' ? null : subject;
  renderFocusRooms();
}

function setSearchFilter(text) {
  focusFilterSearch = text.toLowerCase().trim();
  renderFocusRooms();
}

function clearFilters() {
  focusFilterGrade = null;
  focusFilterSubject = null;
  focusFilterSearch = '';
  const searchBox = document.getElementById('fc-search-input');
  if (searchBox) searchBox.value = '';
  renderFocusRooms();
}

function createFocusRoom() {
  const nameInput = document.getElementById('fc-room-name');
  const gradeSelect = document.getElementById('fc-room-grade');
  const subjectSelect = document.getElementById('fc-room-subject');
  
  const name = nameInput ? nameInput.value.trim() : '';
  const grade = gradeSelect ? parseInt(gradeSelect.value) : 10;
  const subject = subjectSelect ? subjectSelect.value : 'Toán';
  
  if (!name || name.length > 30) {
    alert('Tên phòng phải từ 1-30 ký tự');
    return;
  }

  const room = {
    id: Date.now(),
    name,
    grade,
    subject,
    messages: [{
      type: 'system',
      role: 'system',
      text: `✅ ${name} (Lớp ${grade}) tạo thành công! Hãy tập trung học tập.`,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }],
    created: new Date().toISOString(),
    analytics: { onTopic: 0, offTopic: 0 }
  };

  state.focusRooms.push(room);
  
  try {
    localStorage.setItem('focusRooms', JSON.stringify(state.focusRooms));
  } catch (error) {
    console.warn('localStorage quota exceeded:', error);
  }
  
  closeFocusModal();
  renderFocusRooms();
  renderGradeStats();
  renderRecommendedRooms();
  selectFocusRoom(room.id);
}

// Find room by ID
function findRoomById(roomId) {
  return state.focusRooms.find(r => r.id === parseInt(roomId));
}

// Go to room by ID
function goToRoomById() {
  const roomId = document.getElementById('fc-find-id-input')?.value.trim();
  if (!roomId) {
    alert('Vui lòng nhập ID phòng');
    return;
  }
  
  const room = findRoomById(roomId);
  if (!room) {
    alert('❌ Không tìm thấy phòng với ID: ' + roomId);
    return;
  }
  
  selectFocusRoom(room.id);
  document.getElementById('fc-find-id-input').value = '';
}

// Get rooms filtered by current grade - for future grade-based filtering
function getRoomsByGrade(grade) {
  return state.focusRooms.filter(r => r.grade === grade);
}

// Get all unique grades with active rooms
function getActiveGrades() {
  return [...new Set(state.focusRooms.map(r => r.grade))].sort((a, b) => a - b);
}

// Get all unique subjects
function getActiveSubjects() {
  return [...new Set(state.focusRooms.map(r => r.subject))].sort();
}

// Filter rooms based on current filters
function getFilteredRooms() {
  let filtered = [...state.focusRooms];
  
  if (focusFilterGrade !== null) {
    filtered = filtered.filter(r => r.grade === focusFilterGrade);
  }
  
  if (focusFilterSubject !== null) {
    filtered = filtered.filter(r => r.subject === focusFilterSubject);
  }
  
  if (focusFilterSearch !== '') {
    filtered = filtered.filter(r => r.name.toLowerCase().includes(focusFilterSearch));
  }
  
  return filtered;
}

// Get recommended rooms (popular + recent)
function getRecommendedRooms(limit = 5) {
  return [...state.focusRooms]
    .sort((a, b) => {
      // Score: onTopic count + recency
      const scoreA = (a.analytics.onTopic || 0) + (Date.now() - new Date(a.created)) / 3600000;
      const scoreB = (b.analytics.onTopic || 0) + (Date.now() - new Date(b.created)) / 3600000;
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

// Get grade statistics
function getGradeStats() {
  const stats = {};
  const grades = getActiveGrades();
  
  grades.forEach(grade => {
    const roomsInGrade = getRoomsByGrade(grade);
    const totalOnTopic = roomsInGrade.reduce((sum, r) => sum + (r.analytics.onTopic || 0), 0);
    const totalOffTopic = roomsInGrade.reduce((sum, r) => sum + (r.analytics.offTopic || 0), 0);
    
    stats[grade] = {
      count: roomsInGrade.length,
      onTopic: totalOnTopic,
      offTopic: totalOffTopic,
      quality: totalOnTopic / (totalOnTopic + totalOffTopic + 1) // Avoid division by 0
    };
  });
  
  return stats;
}

function renderFocusRooms() {
  const list = document.getElementById('fc-rooms-list');
  if (!list) return;
  
  // Render filter UI
  renderFocusFilters();
  
  // Get filtered rooms
  const filteredRooms = getFilteredRooms();
  
  // Sort by grade then by creation date
  const sortedRooms = filteredRooms.sort((a, b) => {
    if (a.grade !== b.grade) return a.grade - b.grade;
    return new Date(b.created) - new Date(a.created);
  });
  
  if (state.focusRooms.length === 0) {
    list.innerHTML = '<div style="padding:20px;color:var(--muted2);font-size:13px;text-align:center">📭 Chưa có phòng. Tạo phòng mới đi!</div>';
  } else if (sortedRooms.length === 0) {
    list.innerHTML = '<div style="padding:20px;color:var(--muted2);font-size:13px;text-align:center">❌ Không có phòng phù hợp với bộ lọc. <button onclick="clearFilters()" style="background:var(--accent);color:#fff;padding:4px 10px;border:none;border-radius:4px;cursor:pointer;font-size:11px;">Xóa bộ lọc</button></div>';
  } else {
    list.innerHTML = sortedRooms.map(r => `
      <div class="focus-item ${state.focusRoomId === r.id ? 'active' : ''}" onclick="selectFocusRoom(${r.id})" title="Lớp ${r.grade} - ${r.subject} • ID: ${r.id}">
        <div class="fi-header">
          <div class="fi-title">${escapeHtml(r.name)}</div>
          <div class="fi-grade">📚 Lớp ${r.grade}</div>
        </div>
        <div class="fi-meta">
          <span style="font-size:11px;color:var(--muted)">📖 ${escapeHtml(r.subject)}</span>
          <span style="font-size:10px;color:var(--muted2);margin-left:8px">🆔 ${r.id}</span>
        </div>
        <div class="fi-stat">
          <span style="color:var(--accent3)">✓ ${r.analytics.onTopic || 0}</span>
          <span style="color:var(--danger); margin-left: 8px">✗ ${r.analytics.offTopic || 0}</span>
        </div>
      </div>
    `).join('');
  }
  
  // Render open rooms grid
  renderOpenRoomsGrid();
}

function renderFocusFilters() {
  // Filters section removed
  return;
  
  const grades = getActiveGrades();
  const subjects = getActiveSubjects();
  const filteredCount = getFilteredRooms().length;
  const totalCount = state.focusRooms.length;
  
  if (grades.length === 0) {
    filterEl.innerHTML = '';
    return;
  }
  
  let html = '<div style="background:linear-gradient(135deg,rgba(79,142,247,.05),rgba(167,139,250,.05));border-radius:12px;padding:16px;border:1px solid rgba(79,142,247,.2);">';
  
  // Filter header with icon and count
  html += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">`;
  html += `<div style="font-size:12px;color:var(--text);font-weight:700;display:flex;align-items:center;gap:6px;">🎯 <span>Bộ lọc nâng cao</span></div>`;
  html += `<span style="font-size:11px;background:linear-gradient(135deg,rgba(79,142,247,.3),rgba(167,139,250,.3));color:var(--accent);padding:3px 10px;border-radius:16px;font-weight:600;border:1px solid rgba(79,142,247,.3);">${filteredCount}/${totalCount}</span>`;
  html += `</div>`;
  
  // Search box with icon
  html += `<div style="margin-bottom:14px;">
    <input id="fc-search-input" type="text" placeholder="🔍 Tìm phòng học..." value="${escapeHtml(focusFilterSearch)}" oninput="setSearchFilter(this.value)" style="
      width:100%;padding:10px 12px;border:1.5px solid rgba(79,142,247,.3);border-radius:8px;
      background:var(--surface2);color:var(--text);font-size:12px;outline:none;
      transition:all .3s;font-family:'DM Sans',sans-serif;
    " onblur="this.style.borderColor='rgba(79,142,247,.2)'" onfocus="this.style.borderColor='var(--accent)'"/>
  </div>`;
  
  // Grade filter dropdown with styling
  html += `<div style="margin-bottom:14px;">
    <label style="font-size:11px;color:var(--muted);font-weight:700;display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">📚 CHỌN LỚP</label>
    <select onchange="setGradeFilter(this.value === '' ? null : parseInt(this.value))" style="
      width:100%;padding:9px 12px;border-radius:8px;border:1.5px solid rgba(79,142,247,.25);
      background:var(--surface2);color:var(--text);font-size:12px;outline:none;cursor:pointer;
      transition:all .3s;font-weight:600;font-family:'DM Sans',sans-serif;
    " onchange="this.style.borderColor='var(--accent)';setTimeout(()=>{this.style.borderColor='rgba(79,142,247,.2)'},200)">
      <option value="" style="background:var(--surface);color:var(--text);font-weight:600;">✓ Tất cả lớp (${state.focusRooms.length})</option>`;
  grades.forEach(g => {
    const count = state.focusRooms.filter(r => r.grade === g).length;
    html += `<option value="${g}" ${focusFilterGrade === g ? 'selected' : ''} style="background:var(--surface);color:var(--text);font-weight:600;">Lớp ${g}</option>`;
  });
  html += `</select></div>`;
  
  // Subject filter dropdown with styling
  if (subjects.length > 0) {
    html += `<div style="margin-bottom:12px;">
      <label style="font-size:11px;color:var(--muted);font-weight:700;display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;">📖 CHỌN MÔN HỌC</label>
      <select onchange="setSubjectFilter(this.value === '' ? null : this.value)" style="
        width:100%;padding:9px 12px;border-radius:8px;border:1.5px solid rgba(167,139,250,.25);
        background:var(--surface2);color:var(--text);font-size:12px;outline:none;cursor:pointer;
        transition:all .3s;font-weight:600;font-family:'DM Sans',sans-serif;
      " onchange="this.style.borderColor='var(--accent2)';setTimeout(()=>{this.style.borderColor='rgba(167,139,250,.2)'},200)">
        <option value="" style="background:var(--surface);color:var(--text);font-weight:600;">✓ Tất cả môn (${state.focusRooms.length})</option>`;
    subjects.forEach(s => {
      const count = state.focusRooms.filter(r => r.subject === s).length;
      html += `<option value="${s}" ${focusFilterSubject === s ? 'selected' : ''} style="background:var(--surface);color:var(--text);font-weight:600;">🎓 ${escapeHtml(s)} (${count})</option>`;
    });
    html += `</select></div>`;
  }
  
  // Active filters display with better styling
  if (focusFilterGrade !== null || focusFilterSubject !== null || focusFilterSearch !== '') {
    html += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;padding:10px;background:rgba(0,0,0,.2);border-radius:8px;">`;
    if (focusFilterGrade !== null) {
      html += `<span style="
        display:inline-flex;align-items:center;gap:4px;
        background:linear-gradient(135deg,rgba(79,142,247,.25),rgba(79,142,247,.15));
        padding:5px 10px;border-radius:20px;font-size:11px;color:var(--accent);
        border:1.5px solid rgba(79,142,247,.4);font-weight:600;
      ">📚 Lớp ${focusFilterGrade}<span onclick="setGradeFilter(null)" style="cursor:pointer;font-weight:700;margin-left:3px;transition:all .2s;" onmouseover="this.textContent='✕ Xóa'" onmouseout="this.textContent='✕'">✕</span></span>`;
    }
    if (focusFilterSubject !== null) {
      html += `<span style="
        display:inline-flex;align-items:center;gap:4px;
        background:linear-gradient(135deg,rgba(167,139,250,.25),rgba(167,139,250,.15));
        padding:5px 10px;border-radius:20px;font-size:11px;color:var(--accent2);
        border:1.5px solid rgba(167,139,250,.4);font-weight:600;
      ">📝 ${escapeHtml(focusFilterSubject)}<span onclick="setSubjectFilter(null)" style="cursor:pointer;font-weight:700;margin-left:3px;transition:all .2s;" onmouseover="this.textContent='✕ Xóa'" onmouseout="this.textContent='✕'">✕</span></span>`;
    }
    if (focusFilterSearch !== '') {
      html += `<span style="
        display:inline-flex;align-items:center;gap:4px;
        background:linear-gradient(135deg,rgba(59,130,246,.25),rgba(59,130,246,.15));
        padding:5px 10px;border-radius:20px;font-size:11px;color:#3b82f6;
        border:1.5px solid rgba(59,130,246,.4);font-weight:600;
      ">🔍 &quot;${escapeHtml(focusFilterSearch)}&quot;<span onclick="setSearchFilter('')" style="cursor:pointer;font-weight:700;margin-left:3px;transition:all .2s;" onmouseover="this.textContent='✕ Xóa'" onmouseout="this.textContent='✕'">✕</span></span>`;
    }
    html += `</div>`;
  }
  
  // Clear filters button with gradient
  if (focusFilterGrade !== null || focusFilterSubject !== null || focusFilterSearch !== '') {
    html += `<button onclick="clearFilters()" style="
      width:100%;padding:10px;border-radius:8px;
      border:1.5px solid rgba(239,68,68,.4);background:linear-gradient(135deg,rgba(239,68,68,.15),rgba(239,68,68,.05));
      color:#ef4444;font-size:11px;font-weight:700;cursor:pointer;transition:all .3s;
      margin-top:10px;text-transform:uppercase;letter-spacing:0.5px;
    " onmouseover="this.style.background='linear-gradient(135deg,rgba(239,68,68,.25),rgba(239,68,68,.15))';this.style.transform='translateY(-2px)'" onmouseout="this.style.background='linear-gradient(135deg,rgba(239,68,68,.15),rgba(239,68,68,.05))';this.style.transform='translateY(0)'">🔄 Xóa tất cả bộ lọc</button>`;
  }
  
  html += '</div>';
  filterEl.innerHTML = html;
}

// Get room status based on participants
function getRoomStatus(room) {
  const maxParticipants = 6;
  const currentCount = room.messages.filter(m => m.role !== 'system').length + 1; // Rough estimate
  
  if (currentCount >= maxParticipants) {
    return { status: 'full', text: '🔴 Kín', color: 'room-status-full' };
  } else if (currentCount >= maxParticipants - 1) {
    return { status: 'almost', text: '🟡 Sắp kín', color: 'room-status-almost' };
  } else {
    return { status: 'online', text: '🟢 Còn chỗ', color: 'room-status-online' };
  }
}

function renderOpenRoomsGrid() {
  const gridEl = document.getElementById('open-rooms-grid');
  const emptyState = document.getElementById('fc-empty-state');
  
  if (!gridEl) return;
  
  // Get open rooms (exclude currently selected)
  const openRooms = state.focusRooms.filter(r => r.id !== state.focusRoomId);
  
  if (openRooms.length === 0) {
    gridEl.style.display = 'none';
    if (emptyState) emptyState.style.display = 'flex';
    return;
  }
  
  gridEl.style.display = 'grid';
  if (emptyState) emptyState.style.display = 'none';
  
  gridEl.innerHTML = openRooms.map(room => {
    const status = getRoomStatus(room);
    const participantCount = Math.floor(Math.random() * 4) + 1; // Demo: random 1-4
    
    return `
      <div class="room-card" onclick="selectFocusRoom(${room.id})">
        <div class="room-card-header">
          <div class="room-card-title">${escapeHtml(room.name)}</div>
          <div class="room-card-badge ${status.color}">${status.text}</div>
        </div>
        
        <div class="room-card-info">
          <div class="room-card-info-row">
            <span>📚</span>
            <span><strong>${escapeHtml(room.subject)}</strong> • Lớp ${room.grade}</span>
          </div>
          <div class="room-card-info-row">
            <span>👥</span>
            <span><strong>${participantCount}/6</strong> người đang học</span>
          </div>
          <div class="room-card-info-row">
            <span>⏱</span>
            <span>Vừa tạo</span>
          </div>
        </div>
        
        <div class="room-card-footer">
          <div style="font-size:11px;color:var(--muted);">
            📊 ${room.analytics.onTopic} câu hỏi tốt
          </div>
          <button class="room-join-btn" onclick="event.stopPropagation();selectFocusRoom(${room.id})">
            ▶ Vào phòng
          </button>
        </div>
      </div>
    `;
  }).join('');
}



function renderGradeStats() {
  const statsEl = document.getElementById('fc-grade-stats');
  if (!statsEl) return;
  
  const stats = getGradeStats();
  const grades = Object.keys(stats).sort((a, b) => parseInt(a) - parseInt(b));
  
  if (grades.length === 0) {
    statsEl.innerHTML = '';
    return;
  }
  
  let html = '<div style="font-size:12px;font-weight:600;margin-bottom:8px;">📊 Thống kê theo lớp</div>';
  html += '<div style="display:flex;flex-direction:column;gap:6px;">';
  
  grades.forEach(g => {
    const s = stats[g];
    const qualityPercent = Math.round(s.quality * 100);
    const qualityColor = qualityPercent >= 80 ? 'var(--accent3)' : qualityPercent >= 60 ? 'var(--accent)' : 'var(--danger)';
    
    html += `
      <div style="background:rgba(0,0,0,.2);border-radius:6px;padding:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-weight:600;">Lớp ${g}</span>
          <span style="font-size:11px;color:${qualityColor};">⭐ ${qualityPercent}%</span>
        </div>
        <div style="font-size:11px;color:var(--muted2);">
          ${s.count} phòng • ✓${s.onTopic} • ✗${s.offTopic}
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  statsEl.innerHTML = html;
}

function renderRecommendedRooms() {
  const recEl = document.getElementById('fc-recommended');
  if (!recEl) return;
  
  if (state.focusRooms.length === 0) {
    recEl.innerHTML = '';
    return;
  }
  
  const recommended = getRecommendedRooms(4);
  
  if (recommended.length === 0) {
    recEl.innerHTML = '';
    return;
  }
  
  let html = '<div style="font-size:12px;font-weight:600;margin-bottom:8px;">🔥 Phòng nổi bật</div>';
  html += '<div style="display:flex;flex-direction:column;gap:6px;">';
  
  recommended.forEach(r => {
    const total = (r.analytics.onTopic || 0) + (r.analytics.offTopic || 0);
    const activity = total > 0 ? '🔥' : '✨';
    
    html += `
      <div onclick="selectFocusRoom(${r.id})" style="
        padding:8px;border-radius:6px;border:1px solid var(--border);cursor:pointer;
        background:var(--surface2);transition:all .2s;
      " onmouseover="this.style.borderColor='var(--accent)';this.style.background='rgba(79,142,247,.1)'" 
        onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--surface2)'">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
          <span>${activity}</span>
          <span style="font-weight:600;font-size:12px;">${escapeHtml(r.name)}</span>
        </div>
        <div style="font-size:11px;color:var(--muted2);">
          Lớp ${r.grade} • ${escapeHtml(r.subject)}
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  recEl.innerHTML = html;
}

function renderFocusContent() {
  const room = state.focusRooms.find(r => r.id === state.focusRoomId);
  
  // Update stats and recommendations whenever rendering
  renderGradeStats();
  renderRecommendedRooms();
  
  if (!room) {
    // Show open rooms grid if no room selected
    renderOpenRoomsGrid();
    return;
  }

  const titleEl = document.getElementById('focus-title');
  const msgsEl = document.getElementById('focus-msgs');
  const gradeInfoEl = document.getElementById('focus-grade-info');
  const emptyState = document.getElementById('fc-empty-state');
  const gridEl = document.getElementById('open-rooms-grid');
  
  // Hide empty state and grid when room is selected
  if (emptyState) emptyState.style.display = 'none';
  if (gridEl) gridEl.style.display = 'none';
  
  // Display room title with grade and subject info and delete button
  if (titleEl) {
    titleEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
      <span>💬 ${escapeHtml(room.name)}</span>
      <button onclick="deleteFocusRoom()" style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#ef4444;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:12px;transition:all .2s;">🗑️ Xóa</button>
    </div>`;
  }
  
  // Show grade info badge
  if (gradeInfoEl) {
    gradeInfoEl.innerHTML = `<span style="display:inline-block;background:rgba(79,142,247,.15);padding:4px 12px;border-radius:6px;font-size:12px;color:var(--accent);border:1px solid rgba(79,142,247,.2)">👥 Lớp ${room.grade} • ${escapeHtml(room.subject)}</span>`;
  }

  if (msgsEl) {
    msgsEl.innerHTML = room.messages.map(m => {
      const cls = m.role === 'user' ? 'fmsg-user' : m.role === 'ai' ? 'fmsg-ai' : 'fmsg-sys';
      const ico = m.role === 'user' ? '👤' : m.role === 'ai' ? '🤖' : '✓';
      const hasConfidence = m.role === 'ai' && m.confidence !== undefined;
      const bg = hasConfidence
        ? (m.confidence >= 70 
          ? 'rgba(34,197,94,.08)' 
          : m.confidence >= 40 
            ? 'rgba(168,85,247,.08)' 
            : 'rgba(239,68,68,.08)')
        : 'transparent';
      
      let content = '';
      const msgType = m.type || 'text'; // Default to text for backward compat
      
      if (msgType === 'audio') {
        content = `<audio controls style="width:100%;max-width:200px;margin:4px 0;" src="${m.data || ''}"></audio>`;
      } else if (msgType === 'image') {
        content = `<img src="${m.data || ''}" style="max-width:200px;max-height:200px;border-radius:6px;margin:4px 0;" />`;
      } else {
        content = `<div>${escapeHtml(m.text)}</div>`;
      }
      
      return `
        <div class="${cls}" style="background:${bg};padding:8px;margin:4px 0;border-radius:6px">
          <div style="font-size:11px;color:var(--muted2);margin-bottom:4px">
            ${ico} ${msgType === 'audio' ? '🎤' : msgType === 'image' ? '🖼️' : ''} ${hasConfidence ? '🔍 ' + m.confidence + '%' : m.time || ''}
          </div>
          ${content}
        </div>
      `;
    }).join('');
    
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }
}

function handleFocusKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendFocusMsg();
  }
}

// Voice recording
let mediaRecorder = null;
let audioChunks = [];

function startRecording() {
  audioChunks = [];
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();
    document.getElementById('fc-record-btn').innerHTML = '⏹️ Stop';
    document.getElementById('fc-record-btn').style.background = 'rgba(239,68,68,.2)';
  }).catch(err => {
    alert('❌ Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.');
    console.error(err);
  });
}

function stopRecording() {
  if (!mediaRecorder) return;
  mediaRecorder.stop();
  document.getElementById('fc-record-btn').innerHTML = '🎤 Record';
  document.getElementById('fc-record-btn').style.background = '';
  
  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };
  
  mediaRecorder.onstop = () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const audioUrl = URL.createObjectURL(audioBlob);
    sendAudioMessage(audioUrl);
  };
}

function toggleRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    stopRecording();
  } else {
    startRecording();
  }
}

function sendAudioMessage(audioUrl) {
  const room = state.focusRooms.find(r => r.id === state.focusRoomId);
  if (!room) return;
  
  const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  room.messages.push({ 
    role: 'user', 
    type: 'audio',
    data: audioUrl,
    time: now 
  });
  
  try {
    localStorage.setItem('focusRooms', JSON.stringify(state.focusRooms));
  } catch (error) {
    console.warn('Error saving focus rooms:', error);
  }
  
  renderFocusContent();
}

function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (file.size > 5 * 1024 * 1024) {
    alert('❌ Ảnh quá lớn. Tối đa 5MB.');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const imageUrl = e.target.result;
    const room = state.focusRooms.find(r => r.id === state.focusRoomId);
    if (!room) return;
    
    const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    room.messages.push({ 
      role: 'user', 
      type: 'image',
      data: imageUrl,
      time: now 
    });
    
    try {
      localStorage.setItem('focusRooms', JSON.stringify(state.focusRooms));
    } catch (error) {
      console.warn('Error saving focus rooms:', error);
    }
    
    renderFocusContent();
  };
  reader.readAsDataURL(file);
  event.target.value = ''; // Reset input
}



function sendFocusMsg() {
  const ta = document.getElementById('focus-ta');
  const text = ta ? ta.value.trim() : '';
  
  if (!text) return;
  
  if (ta) ta.value = '';

  const room = state.focusRooms.find(r => r.id === state.focusRoomId);
  if (!room) return;

  const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  room.messages.push({ role: 'user', type: 'text', text, time: now });

  analyzeAndReplyFocusChat(text, room);
  renderFocusContent();
}

// ═══════════════════════════════════════
// AI MODERATOR - SMART ANALYSIS
// ═══════════════════════════════════════
const MODERATOR_REPLIES = {
  onTopic: [
    '✅ Tuyệt vời! Ý kiến rất hữu ích!',
    '✅ Bạn phân tích khá sâu sắc!',
    '✅ Đây là angle thú vị của bài học!',
    '✅ Ý kiến này có giá trị học tập cao!'
  ],
  neutral: [
    '🟡 Liên liếc đến bài học, nhưng cần focus hơn 🎯',
    '🟡 Ý hay, nhưng có thể phát triển thêm?',
    '🟡 Hay, nhưng hãy kết nối với nội dung bài học nhé!'
  ],
  offTopic: [
    '❌ Bạn à, đây hơi off-topic rồi. Hãy quay về bài học! 📚',
    '❌ Hay, nhưng chúng ta cần tập trung vào bài học hiện tại.',
    '❌ Ý tưởng hay, nhưng không phù hợp focus room lúc này 😊'
  ]
};

function analyzeAndReplyFocusChat(text, room) {
  const result = analyzeLearningContent(text, room.subject);
  const confidence = result.confidence;
  
  // Update analytics
  room.analytics[confidence >= 0.7 ? 'onTopic' : 'offTopic']++;

  // Select reply based on confidence and grade-appropriate language
  let replies;
  if (confidence >= 0.7) {
    replies = MODERATOR_REPLIES.onTopic;
  } else if (confidence >= 0.4) {
    replies = MODERATOR_REPLIES.neutral;
  } else {
    replies = MODERATOR_REPLIES.offTopic;
  }
  
  const reply = replies[Math.floor(Math.random() * replies.length)];
  const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  
  room.messages.push({
    role: 'ai',
    text: reply,
    confidence: confidence.toFixed(0),
    time: now,
    grade: room.grade  // Track which grade this message applies to
  });
  
  try {
    localStorage.setItem('focusRooms', JSON.stringify(state.focusRooms));
  } catch (error) {
    console.warn('Error saving focus rooms:', error);
  }
  
  // Update stats after new message
  renderGradeStats();
  renderRecommendedRooms();
}

function analyzeLearningContent(text, subject) {
  const keywords = getSubjectKeywords(subject);
  const ltext = text.toLowerCase();

  // Count keyword matches
  let matches = 0;
  for (let kw of keywords) {
    if (ltext.includes(kw)) matches++;
  }

  // Calculate confidence (0-100)
  const maxMatches = Math.min(keywords.length, 5);
  let confidence = Math.pow(matches / maxMatches, 0.8) * 100;
  confidence = Math.max(0, Math.min(100, confidence));

  // Boost confidence for structured content
  if (/^\d+\.|^-|>|→|:/i.test(text)) {
    confidence = Math.min(100, confidence + 10);
  }

  return { confidence, matches };
}

// Subject keywords for topic detection
const SUBJECT_KEYWORDS = {
  'Toán': ['cộng','trừ','nhân','chia','phương trình','bất phương','hàm số','đạo hàm','tích phân','lũy thừa','căn bậc','số nguyên','phân số','phần trăm','xác suất','thống kê','hình học','tam giác','tứ giác','hình tròn','chu vi','diện tích','thể tích','ma trận','vector','số phức'],
  'Lý': ['lực','chuyển động','gia tốc','vận tốc','công','năng lượng','động lượng','moment','áp suất','sóng','âm tần','ánh sáng','nhiệt độ','điện trường','từ trường','dòng điện','điện trở','ứng dụng','công suất','hiệu suất'],
  'Hóa': ['phản ứng','hợp chất','nguyên tố','hóa trị','mol','khí','lỏng','rắn','axit','bazo','muối','oxi hóa','khử','cân bằng hóa học','nồng độ','dung dịch','pha','tinh thể','polymer','hữu cơ','vô cơ'],
  'Sinh': ['tế bào','protein','lipid','nucleotide','enzyme','quang hợp','hô hấp','khuôn mẫu','gen','phenotype','genotype','đột biến','tiến hóa','sinh sản','hormone','miễn dịch','sinh thái','quần xã','quần hệ','dạy dục'],
  'Anh': ['từ vựng','tense','verb','noun','adjective','adverb','preposition','conjunction','clause','phrase','sentence','paragraph','essay','pronunciation','grammar','vocabulary','idiom','slang','dialogue','passage'],
  'Sử': ['triều','vương','chiến tranh','cuộc kháng chiến','độc lập','thống nhất','lịch sử','sự kiện','nhân vật','thế kỷ','năm','sử liệu','tư liệu','di sản'],
  'Địa': ['bản đồ','địa hình','khí hậu','mưa','thời tiết','đất','khoáng sản','tài nguyên','dân số','thành phố','vùng','hành chính','phát triển','kinh tế','giao thông'],
  'Văn': ['thơ','truyện','tiểu thuyết','tác phẩm','tác giả','nhân vật','cốt truyện','chủ đề','phong cách','ngôn ngữ','biện pháp','so sánh','ẩn dụ','dữa','luân hồi','bố cục'],
  'Quốc phòng': ['quân','quân sự','an ninh','quốc phòng','kỹ chiến','chiến lược','tác chiến','phòng chống','tự vệ','quân nhân'],
  'GDCD': ['đạo đức','quyền','nghĩa vụ','pháp luật','công dân','xã hội','tư pháp','hợp pháp','trách nhiệm','công bằng','nhân quyền'],
  'Mỹ thuật': ['vẽ','tạo hình','hội họa','điệu khiển','phác thảo','tranh','bức','mầu sắc','bố cục','hạt','hạng','trang trí','mỹ học'],
  'Âm nhạc': ['nhạc','bài hát','nốt nhạc','nhạc cụ','giai điệu','hợp âm','tác phẩm','âm hưởng','nhạp','phiên','tiết tấu'],
  'Thể dục': ['thể dục','thể thao','chạy','nhảy','bơi','cầu lông','bóng chuyền','bóng đá','sức khoẻ','thể lực','huấn luyện'],
  'Công Nghệ': ['công nghệ','máy','điện','năng lượng','tái chế','tự động','robot','an toàn','du lịch','công cụ'],
  'Tin học': ['máy tính','phần mềm','code','lập trình','database','web','ứng dụng','hệ điều hành','mạng','an toàn thông tin']
};

function getSubjectKeywords(subject) {
  return SUBJECT_KEYWORDS[subject] || [];
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Initialize demo data for testing
function initializeDemoData() {
  if (state.focusRooms.length > 0) return; // Don't overwrite existing data
  
  const demoRooms = [
    // LỚPS 1-3
    { id: 1001, name: 'Toán 1 - Phép cộng', grade: 1, subject: 'Toán', created: new Date(Date.now() - 10*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Toán 1 tạo thành công!', time: '08:00' }], analytics: { onTopic: 0, offTopic: 0 } },
    { id: 1002, name: 'Tiếng Việt lớp 1', grade: 1, subject: 'Văn', created: new Date(Date.now() - 11*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Tiếng Việt lớp 1 tạo thành công!', time: '09:00' }], analytics: { onTopic: 0, offTopic: 0 } },
    { id: 1003, name: 'Toán 2 - Phép trừ', grade: 2, subject: 'Toán', created: new Date(Date.now() - 12*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Toán 2 tạo thành công!', time: '08:30' }], analytics: { onTopic: 0, offTopic: 0 } },
    { id: 1004, name: 'Tiếng Anh lớp 2', grade: 2, subject: 'Anh', created: new Date(Date.now() - 13*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Tiếng Anh lớp 2 tạo thành công!', time: '10:00' }], analytics: { onTopic: 0, offTopic: 0 } },
    { id: 1005, name: 'Toán 3 - Nhân chia', grade: 3, subject: 'Toán', created: new Date(Date.now() - 14*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Toán 3 tạo thành công!', time: '09:15' }], analytics: { onTopic: 0, offTopic: 0 } },
    { id: 1006, name: 'Khoa học tự nhiên lớp 3', grade: 3, subject: 'Sinh', created: new Date(Date.now() - 15*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Khoa học lớp 3 tạo thành công!', time: '13:00' }], analytics: { onTopic: 0, offTopic: 0 } },
    
    // LỚP 4-6
    { id: 2001, name: 'Toán 4 - Phân số', grade: 4, subject: 'Toán', created: new Date(Date.now() - 9*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Toán 4 tạo thành công!', time: '08:45' }], analytics: { onTopic: 0, offTopic: 0 } },
    { id: 2002, name: 'Lịch sử - Địa lý lớp 4', grade: 4, subject: 'Sử', created: new Date(Date.now() - 10*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Lịch sử lớp 4 tạo thành công!', time: '14:00' }], analytics: { onTopic: 0, offTopic: 0 } },
    { id: 2003, name: 'Toán 5 - Thập phân', grade: 5, subject: 'Toán', created: new Date(Date.now() - 8*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Toán 5 tạo thành công!', time: '09:30' }], analytics: { onTopic: 0, offTopic: 0 } },
    { id: 2004, name: 'Tiếng Anh lớp 5', grade: 5, subject: 'Anh', created: new Date(Date.now() - 7*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Tiếng Anh lớp 5 tạo thành công!', time: '10:30' }], analytics: { onTopic: 1, offTopic: 0 } },
    { id: 2005, name: 'Toán 6 - Hình học', grade: 6, subject: 'Toán', created: new Date(Date.now() - 6*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Toán 6 tạo thành công!', time: '08:00' }], analytics: { onTopic: 1, offTopic: 0 } },
    { id: 2006, name: 'Khoa học tự nhiên lớp 6', grade: 6, subject: 'Sinh', created: new Date(Date.now() - 5*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Khoa học lớp 6 tạo thành công!', time: '13:30' }], analytics: { onTopic: 1, offTopic: 0 } },
    
    // LỚP 7-9
    { id: 3001, name: 'Toán 7 - Đại số', grade: 7, subject: 'Toán', created: new Date(Date.now() - 4*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Toán 7 tạo thành công!', time: '09:00' }], analytics: { onTopic: 1, offTopic: 0 } },
    { id: 3002, name: 'Vật lý lớp 7 - Chuyển động', grade: 7, subject: 'Lý', created: new Date(Date.now() - 3*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Vật lý lớp 7 tạo thành công!', time: '14:15' }, { type: 'text', role: 'user', text: 'Vận tốc là gì?', time: '14:20' }], analytics: { onTopic: 1, offTopic: 0 } },
    { id: 3003, name: 'Hóa học lớp 7', grade: 7, subject: 'Hóa', created: new Date(Date.now() - 2*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Hóa học lớp 7 tạo thành công!', time: '10:45' }], analytics: { onTopic: 0, offTopic: 0 } },
    { id: 3004, name: 'Lịch sử Việt Nam lớp 7', grade: 7, subject: 'Sử', created: new Date(Date.now() - 1*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Lịch sử lớp 7 tạo thành công!', time: '11:00' }], analytics: { onTopic: 0, offTopic: 0 } },
    { id: 3005, name: 'Toán 8 - Nhân thức', grade: 8, subject: 'Toán', created: new Date(Date.now() - 5*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Toán 8 tạo thành công!', time: '08:30' }, { type: 'text', role: 'user', text: 'Hằng đẳng thức là gì?', time: '08:40' }], analytics: { onTopic: 1, offTopic: 0 } },
    { id: 3006, name: 'Sinh học lớp 8 - Tế bào', grade: 8, subject: 'Sinh', created: new Date(Date.now() - 4*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Sinh học 8 tạo thành công!', time: '12:00' }], analytics: { onTopic: 0, offTopic: 0 } },
    { id: 3007, name: 'Địa lý lớp 8', grade: 8, subject: 'Địa', created: new Date(Date.now() - 3*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Địa lý lớp 8 tạo thành công!', time: '14:30' }], analytics: { onTopic: 0, offTopic: 0 } },
    { id: 3008, name: 'Toán 9 - Phương trình', grade: 9, subject: 'Toán', created: new Date(Date.now() - 6*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Toán 9 tạo thành công!', time: '09:15' }, { type: 'text', role: 'user', text: 'Delta = gì?', time: '09:25' }], analytics: { onTopic: 1, offTopic: 0 } },
    { id: 3009, name: 'Hóa 9 - Phản ứng hóa học', grade: 9, subject: 'Hóa', created: new Date(Date.now() - 5*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Hóa 9 tạo thành công!', time: '13:00' }], analytics: { onTopic: 1, offTopic: 0 } },
    { id: 3010, name: 'Tiếng Anh lớp 9 - Unit speaking', grade: 9, subject: 'Anh', created: new Date(Date.now() - 2*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Tiếng Anh 9 tạo thành công!', time: '15:00' }], analytics: { onTopic: 1, offTopic: 0 } },
    { id: 3011, name: 'GDCD lớp 9 - Công dân', grade: 9, subject: 'GDCD', created: new Date(Date.now() - 1*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ GDCD 9 tạo thành công!', time: '10:00' }, { type: 'text', role: 'user', text: 'Quyền và nghĩa vụ công dân?', time: '10:15' }], analytics: { onTopic: 1, offTopic: 0 } },
    
    // LỚP 10-12
    { id: 4001, name: 'Toán 10 - Lượng giác', grade: 10, subject: 'Toán', created: new Date(Date.now() - 2*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Toán 10 tạo thành công!', time: '10:30' }, { type: 'text', role: 'user', text: 'Sin cos tan là gì?', time: '10:40' }], analytics: { onTopic: 2, offTopic: 0 } },
    { id: 4002, name: 'Vật lý 10 - Cơ học', grade: 10, subject: 'Lý', created: new Date(Date.now() - 3*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Vật lý 10 tạo thành công!', time: '14:00' }, { type: 'text', role: 'user', text: 'F = ma?', time: '14:10' }], analytics: { onTopic: 2, offTopic: 0 } },
    { id: 4003, name: 'Hóa 10 - Bảng tuần hoàn', grade: 10, subject: 'Hóa', created: new Date(Date.now() - 1*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Hóa 10 tạo thành công!', time: '11:00' }], analytics: { onTopic: 1, offTopic: 0 } },
    { id: 4004, name: 'Địa lý 10 - Địa lý thế giới', grade: 10, subject: 'Địa', created: new Date(Date.now() - 4*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Địa 10 tạo thành công!', time: '13:30' }], analytics: { onTopic: 1, offTopic: 0 } },
    { id: 4005, name: 'Tiếng Anh 10 - Grammar', grade: 10, subject: 'Anh', created: new Date(Date.now() - 3*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Anh 10 tạo thành công!', time: '15:00' }], analytics: { onTopic: 1, offTopic: 0 } },
    { id: 4006, name: 'Văn 10 - Tác phẩm kinh điển', grade: 10, subject: 'Văn', created: new Date(Date.now() - 2*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Văn 10 tạo thành công!', time: '09:00' }], analytics: { onTopic: 1, offTopic: 0 } },
    { id: 4007, name: 'Toán 11 - Hàm số', grade: 11, subject: 'Toán', created: new Date(Date.now() - 3*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Toán 11 tạo thành công!', time: '08:00' }, { type: 'text', role: 'user', text: 'Đạo hàm là gì?', time: '08:15' }], analytics: { onTopic: 2, offTopic: 0 } },
    { id: 4008, name: 'Vật lý 11 - Điện và từ', grade: 11, subject: 'Lý', created: new Date(Date.now() - 2*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Vật lý 11 tạo thành công!', time: '14:30' }, { type: 'text', role: 'user', text: 'Dòng điện xoay chiều?', time: '14:45' }], analytics: { onTopic: 2, offTopic: 0 } },
    { id: 4009, name: 'Hóa 11 - Hóa hữu cơ', grade: 11, subject: 'Hóa', created: new Date(Date.now() - 1*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Hóa 11 tạo thành công!', time: '10:00' }], analytics: { onTopic: 1, offTopic: 0 } },
    { id: 4010, name: 'Sinh 11 -유전학', grade: 11, subject: 'Sinh', created: new Date(Date.now() - 4*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Sinh 11 tạo thành công!', time: '12:30' }], analytics: { onTopic: 1, offTopic: 0 } },
    { id: 4011, name: 'Tin học 11 - Lập trình', grade: 11, subject: 'Tin học', created: new Date(Date.now() - 3*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Tin 11 tạo thành công!', time: '15:30' }, { type: 'text', role: 'user', text: 'Vòng lặp for..while?', time: '15:45' }], analytics: { onTopic: 2, offTopic: 0 } },
    { id: 4012, name: 'Toán 12 - Tích phân', grade: 12, subject: 'Toán', created: new Date(Date.now() - 2*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Toán 12 tạo thành công!', time: '09:30' }, { type: 'text', role: 'user', text: 'Tích phân bất định?', time: '09:45' }], analytics: { onTopic: 2, offTopic: 0 } },
    { id: 4013, name: 'Vật lý 12 - Hạt nhân', grade: 12, subject: 'Lý', created: new Date(Date.now() - 1*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Vật lý 12 tạo thành công!', time: '13:00' }, { type: 'text', role: 'user', text: 'Phóng xạ là gì?', time: '13:15' }], analytics: { onTopic: 2, offTopic: 0 } },
    { id: 4014, name: 'Hóa 12 - Ôn thi đại học', grade: 12, subject: 'Hóa', created: new Date(Date.now() - 3*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Hóa 12 tạo thành công!', time: '11:30' }], analytics: { onTopic: 1, offTopic: 0 } },
    { id: 4015, name: 'Sinh 12 - Tiến hóa', grade: 12, subject: 'Sinh', created: new Date(Date.now() - 2*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Sinh 12 tạo thành công!', time: '14:00' }], analytics: { onTopic: 1, offTopic: 0 } },
    { id: 4016, name: 'Tiếng Anh 12 - IELTS', grade: 12, subject: 'Anh', created: new Date(Date.now() - 1*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Anh 12 tạo thành công!', time: '16:00' }], analytics: { onTopic: 1, offTopic: 0 } },
    { id: 4017, name: 'Văn 12 - Nghị luận xã hội', grade: 12, subject: 'Văn', created: new Date(Date.now() - 4*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Văn 12 tạo thành công!', time: '10:30' }], analytics: { onTopic: 1, offTopic: 0 } },
    { id: 4018, name: 'Sử 12 - Lịch sử thế giới', grade: 12, subject: 'Sử', created: new Date(Date.now() - 3*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Sử 12 tạo thành công!', time: '11:00' }], analytics: { onTopic: 1, offTopic: 0 } },
    { id: 4019, name: 'Mỹ thuật 11 - Vẽ phác thảo', grade: 11, subject: 'Mỹ thuật', created: new Date(Date.now() - 5*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Mỹ thuật 11 tạo thành công!', time: '15:00' }], analytics: { onTopic: 1, offTopic: 0 } },
    { id: 4020, name: 'Âm nhạc 10 - Lịch sử nhạc', grade: 10, subject: 'Âm nhạc', created: new Date(Date.now() - 6*24*60*60*1000).toISOString(), messages: [{ type: 'system', role: 'system', text: '✅ Âm nhạc 10 tạo thành công!', time: '16:30' }], analytics: { onTopic: 1, offTopic: 0 } }
  ];
  
  state.focusRooms = demoRooms;
  try {
    localStorage.setItem('focusRooms', JSON.stringify(state.focusRooms));
  } catch (error) {
    console.warn('Error saving demo rooms:', error);
  }
}


function deleteFocusRoom() {
  const room = state.focusRooms.find(r => r.id === state.focusRoomId);
  if (!room) return;
  
  if (!confirm(`Xóa phòng "${room.name}"? Hành động này không thể hoàn tác!`)) {
    return;
  }
  
  state.focusRooms = state.focusRooms.filter(r => r.id !== state.focusRoomId);
  state.focusRoomId = null;
  
  try {
    localStorage.setItem('focusRooms', JSON.stringify(state.focusRooms));
  } catch (error) {
    console.warn('Error saving focus rooms:', error);
  }
  
  renderFocusRooms();
  renderFocusContent();
  renderGradeStats();
  renderRecommendedRooms();
}
