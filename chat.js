/**
 * StudyMate AI - CHAT MODULE (OPTIMIZED)
 * Manages: Chat UI, Messages, PDF handling, Rate limiting, Retry logic
 */

// ═══════════════════════════════════════
// RATE LIMITING & DEBOUNCE
// ═══════════════════════════════════════
let isSending = false;
let sendDebounceTimer = null;
const MIN_MESSAGE_DELAY = 500; // Minimum delay between messages
const MAX_REQUEST_RETRY = 3;
const RETRY_DELAY_BASE = 2000; // Start with 2 seconds

function debounce(fn, delay) {
  return (...args) => {
    clearTimeout(sendDebounceTimer);
    sendDebounceTimer = setTimeout(() => fn(...args), delay);
  };
}

function canSendMessage() {
  if (isSending) {
    showError('⏱️ Đợi tin nhắn trước gửi đi. Không spam nhé!');
    return false;
  }
  return true;
}

// ═══════════════════════════════════════
// CHAT UI & MESSAGE HANDLING
// ═══════════════════════════════════════
function sendMsg() {
  const ta = document.getElementById('chat-ta');
  if (!ta) return;
  
  const text = ta.value.trim();
  if (!text) return;
  
  if (!canSendMessage()) return;
  
  ta.value = '';
  ta.style.height = 'auto';
  sendChatMessage(text);
}

function quickAsk(q) {
  const ta = document.getElementById('chat-ta');
  if (ta) {
    ta.value = q;
    sendMsg();
  }
}

function askAboutPdf() {
  quickAsk('Hãy tóm tắt nội dung trọng tâm của tài liệu PDF em vừa upload');
}

async function sendChatMessage(text, retryCount = 0) {
  if (!text || typeof text !== 'string') return;
  
  // Rate limiting check
  if (isSending) {
    showError('⏱️ Vui lòng chờ tin nhắn trước xử lý xong.');
    return;
  }
  
  isSending = true;
  hideError();
  appendMsg(text, 'user');
  updateSubjectMemory(text); // Save to subject-specific memory
  state.chatHistory.push({ role: 'user', content: text });
  recordAiQuestion();

  const typId = appendTyping();
  try {
    const reply = await callAIWithRetry(text, retryCount);
    removeEl(typId);
    appendMsg(reply, 'ai');
    state.chatHistory.push({ role: 'assistant', content: reply });
    
    // Keep history manageable (max 20 messages to avoid token overflow)
    if (state.chatHistory.length > 20) {
      state.chatHistory = state.chatHistory.slice(-20);
    }
  } catch (error) {
    removeEl(typId);
    console.error('Chat error:', error);
    showError(error.message || '❌ Có lỗi xảy ra. Vui lòng thử lại.');
  } finally {
    isSending = false;
  }
}

async function callAIWithRetry(userMessage, retryCount = 0) {
  try {
    return await callAI(userMessage);
  } catch (error) {
    // Check if it's a rate limit error (429) or network error
    const isRateLimitError = error.message?.includes('429') || error.message?.includes('Quá nhiều request');
    const isNetworkError = error.message?.includes('kết nối');
    
    if ((isRateLimitError || isNetworkError) && retryCount < MAX_REQUEST_RETRY) {
      // Calculate exponential backoff: 2s, 4s, 8s
      const delayMs = RETRY_DELAY_BASE * Math.pow(2, retryCount);
      const delaySec = Math.round(delayMs / 1000);
      
      console.log(`🔄 Retry ${retryCount + 1}/${MAX_REQUEST_RETRY} trong ${delaySec}s...`);
      showError(`⏳ Tải cao, retry tự động trong ${delaySec}s...`);
      
      // Show countdown
      let countdown = delaySec;
      const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          showError(`⏳ Tải cao, retry tự động trong ${countdown}s...`);
        }
        if (countdown <= 0) clearInterval(countdownInterval);
      }, 1000);
      
      await new Promise(r => setTimeout(r, delayMs));
      return callAIWithRetry(userMessage, retryCount + 1);
    }
    
    throw error;
  }
}

// ═══════════════════════════════════════
// MESSAGE RENDERING
// ═══════════════════════════════════════
function appendMsg(text, role) {
  if (!text) return;
  
  const msgs = document.getElementById('chat-msgs');
  if (!msgs) return;
  
  const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  
  const avatar = role === 'ai'
    ? { cls: 'ai', ico: state.model === 'claude' ? '✦' : state.model === 'gpt' ? '⬡' : '◈' }
    : { cls: 'user', ico: 'HS' };
  
  const formatted = formatMessageText(text);
  
  div.innerHTML = `
    <div class="m-avatar ${avatar.cls}">${avatar.ico}</div>
    <div class="m-body">
      <div class="m-bubble">${formatted}</div>
      <div class="m-time">${now}</div>
    </div>`;
  
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function formatMessageText(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:rgba(79,142,247,.1);padding:1px 6px;border-radius:4px;font-size:12px">$1</code>')
    .replace(/\n/g, '<br>');
}

function addSystemMsg(html) {
  const msgs = document.getElementById('chat-msgs');
  if (!msgs) return;
  
  const div = document.createElement('div');
  div.className = 'msg ai';
  div.style.animation = 'msgIn .25s ease';
  
  const ico = state.model === 'gpt' ? '⬡' : state.model === 'gemini' ? '◈' : '✦';
  div.innerHTML = `<div class="m-avatar ai">${ico}</div><div class="m-body"><div class="m-bubble">${html}</div></div>`;
  
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

let typId = 0;
function appendTyping() {
  const id = 'typ-' + (++typId);
  const msgs = document.getElementById('chat-msgs');
  if (!msgs) return id;
  
  const div = document.createElement('div');
  div.className = 'msg ai';
  div.id = id;
  div.innerHTML = `<div class="m-avatar ai">✦</div><div class="m-body"><div class="m-bubble"><div class="typing-wrap"><div class="t-dot"></div><div class="t-dot"></div><div class="t-dot"></div></div></div></div>`;
  
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return id;
}

// ═══════════════════════════════════════
// ERROR HANDLING & UTILITIES
// ═══════════════════════════════════════
function removeEl(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ═══════════════════════════════════════
// SUBJECT-BASED MEMORY MANAGEMENT
// ═══════════════════════════════════════
// Store conversation history per subject
if (!state.subjectMemory) {
  state.subjectMemory = (() => {
    try {
      return JSON.parse(localStorage.getItem('sm_subject_memory')) || {};
    } catch {
      return {};
    }
  })();
}

function initializeSubjectMemory(subject) {
  if (!state.subjectMemory[subject]) {
    state.subjectMemory[subject] = {
      conversations: [],
      createdAt: new Date().toISOString(),
      totalMessages: 0,
      solveMode: '🧠', // Default: detailed mode
    };
  }
}

function updateSubjectMemory(text) {
  const subject = state.subject || 'Default';
  initializeSubjectMemory(subject);
  
  if (!state.subjectMemory[subject].conversations) {
    state.subjectMemory[subject].conversations = [];
  }
  
  state.subjectMemory[subject].conversations.push({
    timestamp: new Date().toISOString(),
    message: text,
  });
  
  state.subjectMemory[subject].totalMessages += 1;
  
  try {
    localStorage.setItem('sm_subject_memory', JSON.stringify(state.subjectMemory));
  } catch (error) {
    console.warn('localStorage quota exceeded:', error);
  }
}

function switchSubjectMemory(subject) {
  initializeSubjectMemory(subject);
  const memory = state.subjectMemory[subject];
  
  // Restore previous conversation
  state.chatHistory = memory.conversations.slice(-20).map((c, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: c.message,
  })) || [];
  
  // Update UI
  const msgEl = document.getElementById('chat-msgs');
  if (msgEl) {
    msgEl.innerHTML = ''; // Clear chat
    addSystemMsg(`📚 Chuyển sang <strong>${subject}</strong><br>Tổng tin nhắn: ${memory.totalMessages}`);
  }
}

function showError(msg) {
  const errorEl = document.getElementById('chat-error');
  const errorTxt = document.getElementById('chat-error-txt');
  
  if (errorEl) errorEl.style.display = 'flex';
  if (errorTxt) errorTxt.innerHTML = '⚠️ <strong>' + msg + '</strong>';
}

function hideError() {
  const errorEl = document.getElementById('chat-error');
  if (errorEl) errorEl.style.display = 'none';
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMsg();
  }
}

function autoResize(el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// ═══════════════════════════════════════
// PDF HANDLING
// ═══════════════════════════════════════
function handlePdfFile(input) {
  const file = input.files ? input.files[0] : null;
  if (!file) return;
  processPdfFile(file);
}

function handlePdfDrop(e) {
  e.preventDefault();
  const zone = document.getElementById('pdf-zone');
  if (zone) zone.classList.remove('dragover');
  
  const file = e.dataTransfer ? e.dataTransfer.files[0] : null;
  if (file) processPdfFile(file);
}

function processPdfFile(file) {
  if (!file) return;
  
  const zone = document.getElementById('pdf-zone');
  if (zone) zone.textContent = '⏳ Đang đọc file...';

  const reader = new FileReader();
  reader.onerror = () => {
    if (zone) zone.innerHTML = '❌ Lỗi đọc file';
  };
  
  reader.onload = (ev) => {
    try {
      // Handle text files
      if (file.name.endsWith('.txt')) {
        state.pdfText = ev.target.result;
        if (zone) zone.innerHTML = '✅ Đã tải';
        
        const nameEl = document.getElementById('pdf-name');
        if (nameEl) {
          nameEl.textContent = '📄 ' + file.name;
          nameEl.style.display = 'block';
        }
        
        const askBtn = document.getElementById('pdf-ask-btn');
        if (askBtn) askBtn.style.display = 'inline-flex';
        
        addSystemMsg(`📄 Đã tải tài liệu <strong>${escapeHtml(file.name)}</strong>! Bạn có thể hỏi mình về nội dung file này nhé.`);
        gotoPanel('chat', document.querySelector('.nav-pill:nth-child(2)'));
      } else {
        // For PDF files: show placeholder since full PDF reading requires PDF.js
        state.pdfText = `[Nội dung PDF: ${file.name}]\n(Để đọc PDF đầy đủ cần thư viện PDF.js — demo này hỗ trợ file .txt)`;
        
        if (zone) {
          zone.innerHTML = '📄 ' + file.name.slice(0, 18) + (file.name.length > 18 ? '…' : '');
        }
        
        const nameEl = document.getElementById('pdf-name');
        if (nameEl) {
          nameEl.textContent = '📄 ' + file.name;
          nameEl.style.display = 'block';
        }
        
        const askBtn = document.getElementById('pdf-ask-btn');
        if (askBtn) askBtn.style.display = 'inline-flex';
        
        addSystemMsg(`📎 Đã nhận file <strong>${escapeHtml(file.name)}</strong>. Lưu ý: Demo này hỗ trợ tốt nhất file <strong>.txt</strong>. Bạn có thể đặt câu hỏi về tài liệu nhé!`);
        gotoPanel('chat', document.querySelector('.nav-pill:nth-child(2)'));
      }
    } catch (error) {
      console.error('Error processing file:', error);
      if (zone) zone.innerHTML = '❌ Lỗi xử lý file';
    }
  };
  
  reader.readAsText(file);
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// ═══════════════════════════════════════
// SOLVE MODES - 3 Cách giải bài nâng cao
// ═══════════════════════════════════════

if (!state.solveMode) {
  state.solveMode = 'detailed'; // Default mode
}

function setSolveMode(mode) {
  state.solveMode = mode;
  
  // Update UI - highlight active button
  document.querySelectorAll('.solve-mode').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById('solve-' + mode)?.classList.add('active');
  
  const modeInfo = {
    detailed: '🧠 Chế độ chi tiết: Giải chi tiết từng bước',
    hint: '⚡ Chế độ gợi ý: Gợi ý từng bước, không lộ đáp án',
    exam: '🎓 Chế độ thi: Chỉ chấm điểm và nhận xét',
  };
  
  addSystemMsg(modeInfo[mode]);
  
  // Save preference
  try {
    localStorage.setItem('sm_solve_mode', mode);
  } catch (e) {
    console.warn('Storage error:', e);
  }
}

function getSystemPromptForMode() {
  const baseModePrompts = {
    detailed: `\n📌 CHẾ ĐỘ GIẢI CHI TIẾT:
- Giải chi tiết từng bước rõ ràng
- Trình bày công thức/quy tắc cần dùng
- Giải thích tại sao làm bước này
- Cho ví dụ minh họa nếu cần
- Kết luận rõ ràng`,
    
    hint: `\n⚡ CHẾ ĐỘ GỢI Ý:
- Không lộ đáp án ngay
- Gợi ý từng bước để học sinh tự giải
- Dùng câu hỏi hướng dẫn
- Nếu sai → gợi ý sửa, không giải luôn
- Khuyến khích học sinh tự suy nghĩ`,
    
    exam: `\n🎓 CHẾ ĐỘ THI:
- Chấm điểm bài làm (0-10)
- Chỉ ra lỗi sai chính (không giải chi tiết)
- Gợi ý sửa ngắn gọn
- Nhận xét mạnh/yếu của bài
- Không giải chi tiết đáp án`,
  };
  
  return baseModePrompts[state.solveMode] || baseModePrompts.detailed;
}
