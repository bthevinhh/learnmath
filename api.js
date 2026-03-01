/**
 * StudyMate AI - API MODULE (DEMO MODE)
 * No real API calls - all mock responses for GitHub Pages
 */

// ═══════════════════════════════════════
// DEMO RESPONSES DATABASE
// ═══════════════════════════════════════
const DEMO_RESPONSES = {
  math: {
    'giải thích': [
      '📐 **Định lý Pythagoras**: Trong một tam giác vuông, bình phương cạnh huyền bằng tổng bình phương hai cạnh góc vuông.\n\n**Công thức**: a² + b² = c²\n\n**Ví dụ**: Nếu a=3, b=4, thì c=5',
      '🔢 **Phương trình bậc hai**: ax² + bx + c = 0\n\n**Công thức nghiệm**: x = (-b ± √(b²-4ac)) / 2a\n\n**Ví dụ giải**: Với x² - 5x + 6 = 0 → x = 2 hoặc x = 3',
      '➕ **Hệ phương trình tuyến tính**:\n• Phương pháp cộng đại số\n• Phương pháp thế\n• Phương pháp ma trận\n\nHãy cho tôi một hệ cụ thể để giải!'
    ],
    'mẹo': [
      '💡 **Mẹo nhất dạo bao giờ?**: Khi nhân hai số gần với 10, ta dùng: (10+a)(10+b) = 100 + 10(a+b) + ab',
      '🎯 **Chia hết cho 3?**: Tổng các chữ số chia hết cho 3 thì số đó chia hết cho 3!',
      '📊 **Giải bất phương trình**: Nhớ đổi chiều dấu = khi nhân chia với số âm!'
    ]
  },
  lý: {
    'giải thích': [
      '⚡ **Định luật Ohm**: V = I × R\n\n**Nghĩa**: Hiệu điện thế = Cường độ dòng × Điện trở\n\n**Ứng dụng**: Tính dòng điện trong mạch',
      '🌡️ **Nhiệt lượng**: Q = m × c × ΔT\n\n**m**: Khối lượng (kg)\n**c**: Nhiệt dung riêng\n**ΔT**: Thay đổi nhiệt độ\n\nThí dụ: Đun nóng 2kg nước từ 20°C → 80°C',
      '🔬 **Tốc độ, vận tốc, gia tốc**:\n• v = s/t (tốc độ trung bình)\n• a = Δv/Δt (gia tốc)\n• v² = v₀² + 2as'
    ],
    'mẹo': [
      '🎓 **Nhớ công thức**: Dùng mnemonic hoặc hình ảnh liên tưởng!',
      '📈 **Vẽ sơ đồ**: Luôn vẽ hình minh họa trước khi giải',
      '✍️ **Ghi rõ đơn vị**: Luôn viết đơn vị trong từng bước tính'
    ]
  },
  hóa: {
    'giải thích': [
      '⚗️ **Cân bằng phương trình hóa học**: 2H₂ + O₂ → 2H₂O\n\n**Bước 1**: Đếm nguyên tử từng loại bên trái\n**Bước 2**: Thêm hệ số để cân bằng\n**Bước 3**: Kiểm tra lại',
      '🧪 **Phản ứng oxi hóa - khử**:\n• Oxi hóa: Mất electron (tăng hóa trị)\n• Khử: Nhận electron (giảm hóa trị)\n\nVí dụ: 2Fe + 3Cl₂ → 2FeCl₃',
      '🔋 **Điện hóa**: Pin, điện phân, cầu điện hóa\n\nNhớ: Cực + là Anode (oxi hóa), Cực - là Cathode (khử)'
    ],
    'mẹo': [
      '🎯 **Bảng tuần hoàn**: Học vị trí các nhóm chính',
      '⚖️ **Cân bằng**: Bắt đầu từ element xuất hiện ít nhất',
      '🧮 **Tính mol**: Luôn dùng công thức n = m/M (khối lượng/khối lượng mol)'
    ]
  },
  default: {
    'giải thích': [
      '👋 Xin chào! Tôi là StudyMate AI - trợ lý học tập thông minh.\n\n📚 Tôi có thể giúp bạn:\n✓ Giải thích bài học\n✓ Giải bài tập\n✓ Tóm tắt tài liệu\n✓ Trả lời mọi câu hỏi\n\nHãy hỏi tôi bất cứ điều gì nhé! 🚀',
      '🎓 **Chế độ chơi**:\n🧠 **Chi tiết**: Giải thích đầy đủ từng bước\n⚡ **Gợi ý**: Chỉ cho hint, không đáp án\n🎓 **Thi**: Chỉ cho điểm, không giải thích\n\nChọn ở thanh công cụ bên trên!',
      '💪 **Động lực**:\n• Mỗi Pomodoro thành công = +10 XP\n• 5 Pomodoro liên tiếp = +50 Bonus XP\n• Lên level cứ 300 XP\n\nKhiêu chiến bản thân! 💯'
    ]
  }
};

// ═══════════════════════════════════════
// API HEALTH & STATUS
// ═══════════════════════════════════════
const apiHealth = {
  status: 'idle',
  lastResponseTime: 0,
  errorCount: 0,
  successCount: 0,
  rateLimitHits: 0,
};

function updateSystemStatus(status) {
  apiHealth.status = status;
  const statusDot = document.getElementById('status-dot');
  const statusTxt = document.getElementById('api-status-txt');
  
  if (!statusDot || !statusTxt) return;
  
  statusDot.className = 'status-dot';
  
  switch(status) {
    case 'connected':
      statusDot.classList.add('connected');
      statusTxt.textContent = `✅ Demo Mode (${apiHealth.successCount} msg)`;
      break;
    case 'loading':
      statusDot.classList.add('loading');
      statusTxt.textContent = '✨ Đang tạo phản hồi...';
      break;
    case 'error':
      statusDot.classList.add('error');
      statusTxt.textContent = `⚠️ Lỗi (${apiHealth.errorCount} err)`;
      break;
    default:
      statusTxt.textContent = '💻 Demo Mode';
  }
}

function getRandomDemoResponse() {
  const category = state.subject.toLowerCase().includes('toán') ? 'math' 
                 : state.subject.toLowerCase().includes('lý') ? 'lý'
                 : state.subject.toLowerCase().includes('hóa') ? 'hóa'
                 : 'default';
  
  const subCategory = state.subject.includes('thực hành') ? 'mẹo' : 'giải thích';
  const responses = DEMO_RESPONSES[category]?.[subCategory] || DEMO_RESPONSES.default['giải thích'];
  
  return responses[Math.floor(Math.random() * responses.length)];
}
// ═══════════════════════════════════════
// MODAL MANAGEMENT (SIMPLIFIED)
// ═══════════════════════════════════════
function openModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.add('open');
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.remove('open');
}

function setActiveModalTab(index) {
  const tabs = document.querySelectorAll('.mtab');
  tabs.forEach((t, i) => {
    t.classList.toggle('active', i === index);
  });
}

function selectModalModel(m, el) {
  // No-op in demo mode
}

function updateKeyHint() {
  const hintEl = document.getElementById('key-hint');
  if (hintEl) hintEl.innerHTML = '🎓 Demo Mode: Không cần API key!';
}

function saveKey() {
  alert('📌 Demo Mode: Các tin nhắn được tạo tự động. Để sử dụng AI thật, hãy triển khai với Firebase!');
  closeModal();
}

function clearKey() {
  closeModal();
}

function toggleKeyVis() {
  const input = document.getElementById('api-key-input');
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
  }
}

// ═══════════════════════════════════════
// STATUS & MODEL MANAGEMENT
// ═══════════════════════════════════════
function updateApiStatus() {
  const txt = document.getElementById('api-status-txt');
  if (txt) txt.textContent = '✨ Demo Mode · Status Good';
}

function switchModel(m, btn) {
  const buttons = document.querySelectorAll('.model-btn');
  buttons.forEach(b => b.classList.remove('active'));
  
  if (btn) btn.classList.add('active');
  
  state.model = m;
  try {
    sessionStorage.setItem('sm_model', m);
  } catch (error) {
    console.warn('Error saving model to sessionStorage:', error);
  }
  updateApiStatus();
}// ═══════════════════════════════════════
// API CALLS (DEMO MODE - NO REAL API)
// ═══════════════════════════════════════
async function callAI(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') {
    throw new Error('❌ Tin nhắn không hợp lệ');
  }

  updateSystemStatus('loading');
  const startTime = Date.now();

  try {
    // Simulate API delay (200-600ms)
    const delay = 200 + Math.random() * 400;
    await new Promise(r => setTimeout(r, delay));
    
    // Get demo response based on subject
    const reply = getRandomDemoResponse();
    
    // Track success
    apiHealth.lastResponseTime = Date.now() - startTime;
    apiHealth.successCount++;
    updateSystemStatus('connected');
    
    return reply;
  } catch (error) {
    // Track error
    apiHealth.errorCount++;
    updateSystemStatus('error');
    throw error;
  }
}
