# Code Citations

## License: unknown
https://github.com/tvloc38/web-fullstack/blob/e6d5114b97a1c73410eb44c61bcce96b19f65496/nodejs/HTML%20CSS/index.html

```
# 🚀 Nâng cấp StudyMate AI - Tích hợp FocusChat

Tôi sẽ giúp bạn tích hợp module **FocusChat** vào StudyMate AI. Đây là quy trình từng bước:

## 📋 Kế hoạch thực hiện

1. **Tạo model dữ liệu** cho phòng học & tin nhắn
2. **Tích hợp API AI** để phân loại nội dung
3. **Xây dựng logic giám sát** (warning → limit → lock)
4. **Tạo UI cho FocusChat**
5. **Tính năng đặc biệt**: Tóm tắt, gợi ý, hệ thống điểm

---

## 📁 Các file cần tạo/chỉnh sửa

### 1. `c:\Users\nh\Downloads\dự án ai\models\FocusChat.js`

Model cho phòng học với giám sát AI

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\models\FocusChat.js
const mongoose = require('mongoose');

// Schema cho tin nhắn
const messageSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
  contentType: { type: String, enum: ['learning', 'non-learning', 'spam'], default: null },
  aiAnalysis: {
    relevanceScore: Number, // 0-100
    category: String,
    warning: Boolean,
    suggestedEdit: String
  },
  isEdited: Boolean,
  editedContent: String
});

// Schema cho phòng học
const focusChatRoomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true },
  roomName: String,
  subject: { type: String, enum: ['Toán', 'Văn', 'Anh', 'Lý', 'Hóa', 'Sinh'] },
  createdBy: String,
  members: [
    {
      userId: String,
      userName: String,
      joinedAt: { type: Date, default: Date.now },
      warningCount: { type: Number, default: 0 },
      lockUntil: Date,
      points: { type: Number, default: 0 },
      role: { type: String, enum: ['teacher', 'student'], default: 'student' }
    }
  ],
  messages: [messageSchema],
  roomStatus: { type: String, enum: ['active', 'archived'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  summary: {
    lastSummaryAt: Date,
    content: String,
    pdfUrl: String
  },
  lastActivityAt: { type: Date, default: Date.now },
  silenceStartTime: Date // Để track khi nào bắt đầu im lặng
});

// Schema cho lịch sử vi phạm
const violationHistorySchema = new mongoose.Schema({
  userId: String,
  roomId: String,
  violationType: { type: String, enum: ['warning', 'limit', 'lock'], default: 'warning' },
  messageId: String,
  violatedContent: String,
  timestamp: { type: Date, default: Date.now },
  lockDuration: Number // phút
});

module.exports = {
  FocusRoom: mongoose.model('FocusRoom', focusChatRoomSchema),
  Violation: mongoose.model('Violation', violationHistorySchema)
};
```

---

### 2. `c:\Users\nh\Downloads\dự án ai\services\aiContentAnalyzer.js`

Service phân tích nội dung bằng AI

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\services\aiContentAnalyzer.js
const axios = require('axios');

class AIContentAnalyzer {
  constructor(apiKey, provider = 'openai') {
    this.apiKey = apiKey;
    this.provider = provider;
  }

  async analyzeMessage(message, subject) {
    try {
      let response;

      if (this.provider === 'openai') {
        response = await this._analyzeWithOpenAI(message, subject);
      } else if (this.provider === 'google') {
        response = await this._analyzeWithGoogle(message, subject);
      }

      return response;
    } catch (error) {
      console.error('AI Analysis Error:', error);
      return this._defaultAnalysis();
    }
  }

  async _analyzeWithOpenAI(message, subject) {
    const prompt = `
    Phân tích tin nhắn sau trong ngữ cảnh phòng học môn "${subject}".
    
    Tin nhắn: "${message}"
    
    Trả lại JSON với:
    {
      "contentType": "learning" | "non-learning" | "spam",
      "relevanceScore": 0-100,
      "category": "kiến thức" | "bài tập" | "thảo luận" | "không liên quan" | "spam",
      "isApproved": true/false,
      "suggestedEdit": "đề xuất sửa (nếu cần)",
      "reason": "lý do phân loại"
    }`;

    const res = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Bạn là trợ lý giáo dục phân tích nội dung học tập'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return JSON.parse(res.data.choices[0].message.content);
  }

  async _analyzeWithGoogle(message, subject) {
    // Tương tự cho Google API
    // TODO: Implement Google API
    return this._defaultAnalysis();
  }

  _defaultAnalysis() {
    return {
      contentType: 'non-learning',
      relevanceScore: 50,
      category: 'unknown',
      isApproved: true,
      suggestedEdit: null,
      reason: 'Không thể phân tích'
    };
  }
}

module.exports = AIContentAnalyzer;
```

---

### 3. `c:\Users\nh\Downloads\dự án ai\services\focusChatManager.js`

Logic giám sát & kiểm soát

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\services\focusChatManager.js
const { FocusRoom, Violation } = require('../models/FocusChat');
const AIContentAnalyzer = require('./aiContentAnalyzer');

class FocusChatManager {
  constructor(aiApiKey, provider = 'openai') {
    this.analyzer = new AIContentAnalyzer(aiApiKey, provider);
  }

  // Tạo phòng học mới
  async createRoom(roomData) {
    const newRoom = new FocusRoom({
      roomId: `room_${Date.now()}`,
      roomName: roomData.roomName,
      subject: roomData.subject,
      createdBy: roomData.createdBy,
      members: [{
        userId: roomData.createdBy,
        userName: roomData.creatorName,
        role: 'teacher'
      }]
    });

    return await newRoom.save();
  }

  // Xử lý tin nhắn + AI phân tích
  async processMessage(roomId, userId, userName, content) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room) throw new Error('Room not found');

    // Kiểm tra user bị khóa
    const member = room.members.find(m => m.userId === userId);
    if (member?.lockUntil && new Date() < member.lockUntil) {
      return {
        status: 'locked',
        message: '⏳ Bạn bị khóa tạm thời. Vui lòng chờ đến: ' + member.lockUntil,
        lockUntil: member.lockUntil
      };
    }

    // AI phân tích nội dung
    const analysis = await this.analyzer.analyzeMessage(content, room.subject);

    // Quyết định hành động
    const action = this._determineAction(member.warningCount, analysis.contentType);

    const messageDoc = {
      userId,
      userName,
      content,
      contentType: analysis.contentType,
      aiAnalysis: analysis,
      timestamp: new Date()
    };

    // Xử lý theo mức độ vi phạm
    if (analysis.contentType === 'learning') {
      // ✅ Nội dung tốt - Công 5 điểm
      messageDoc.warning = false;
      member.points += 5;
    } else if (analysis.contentType === 'non-learning') {
      messageDoc.warning = true;

      if (action === 'warning_1') {
        // 🟢 Mức 1: Nhắc nhở
        room.messages.push(messageDoc);
        await room.save();

        return {
          status: 'warning',
          level: 1,
          message: '⚠️ Tin nhắn này có vẻ không liên quan đến chủ đề học tập. Bạn có muốn chỉnh sửa không?',
          suggestedEdit: analysis.suggestedEdit,
          warningCount: member.warningCount + 1
        };
      } else if (action === 'limit') {
        // 🟡 Mức 2: Giới hạn
        member.warningCount += 1;
        member.points -= 10;
        room.messages.push(messageDoc);
        await room.save();

        return {
          status: 'limit',
          level: 2,
          message: '⏱️ Giới hạn: 1 tin nhắn/2 phút trong 5 phút tới',
          warningCount: member.warningCount
        };
      } else if (action === 'lock') {
        // 🔴 Mức 3: Khóa
        const lockDuration = this._calculateLockDuration(member.warningCount);
        member.lockUntil = new Date(Date.now() + lockDuration * 60000);
        member.warningCount = 0;
        member.points -= 20;

        await new Violation({
          userId,
          roomId,
          violationType: 'lock',
          messageId: undefined,
          violatedContent: content,
          lockDuration: lockDuration
        }).save();

        await room.save();

        return {
          status: 'locked',
          level: 3,
          lockDuration,
          message: `🔒 Bạn bị khóa ${lockDuration} phút vì vi phạm nhiều lần`,
          lockUntil: member.lockUntil
        };
      }
    }

    // Thêm tin nhắn vào room
    room.messages.push(messageDoc);
    room.lastActivityAt = new Date();

    // Reset silence timer
    room.silenceStartTime = null;

    await room.save();

    return {
      status: 'success',
      messageId: messageDoc._id,
      points: member.points
    };
  }

  // Xác định hành động dựa trên số lần cảnh báo
  _determineAction(warningCount, contentType) {
    if (contentType === 'learning') return 'approve';
    if (warningCount === 0) return 'warning_1';
    if (warningCount === 1) return 'limit';
    return 'lock';
  }

  // Tính thời gian khóa tăng dần
  _calculateLockDuration(warningCount) {
    const durations = [30, 60, 1440]; // 30 min, 1h, 24h
    return durations[Math.min(warningCount, 2)];
  }

  // AI tự động tóm tắt sau 60 phút
  async generateSummary(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room) throw new Error('Room not found');

    const recentMessages = room.messages.filter(msg => {
      const age = Date.now() - msg.timestamp;
      return age < 3600000; // 60 phút
    });

    const messageTexts = recentMessages
      .map(m => `${m.userName}: ${m.content}`)
      .join('\n');

    const summaryPrompt = `
    Tóm tắt nội dung chính đã thảo luận trong phòng học môn "${room.subject}":
    
    ${messageTexts}
    
    Hãy tạo bản tóm tắt gọn gàng, có cấu trúc, giúp học sinh ôn tập lại nội dung chính.
    `;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: summaryPrompt
      }]
    }, {
      headers: { 'Authorization': `Bearer ${this.analyzer.apiKey}` }
    });

    const summaryContent = response.data.choices[0].message.content;

    room.summary = {
      lastSummaryAt: new Date(),
      content: summaryContent,
      pdfUrl: null // TODO: Generate PDF
    };

    await room.save();
    return summaryContent;
  }

  // Gợi ý khi nhóm im lặng > 10 phút
  async checkAndSuggestQuestion(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room || room.messages.length === 0) return null;

    const lastMessage = room.messages[room.messages.length - 1];
    const silenceTime = Date.now() - new Date(lastMessage.timestamp);

    if (silenceTime > 600000) { // 10 phút
      // TODO: Generate câu hỏi liên quan từ AI
      return {
        suggestion: '📚 Mọi người có muốn làm thêm 1 bài tập vận dụng không?',
        type: 'question_suggestion'
      };
    }

    return null;
  }

  // Lấy bảng xếp hạng
  async getLeaderboard(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    return room.members
      .sort((a, b) => b.points - a.points)
      .map((m, idx) => ({
        rank: idx + 1,
        name: m.userName,
        points: m.points,
        warningCount: m.warningCount
      }));
  }
}

module.exports = FocusChatManager;
```

---

### 4. `c:\Users\nh\Downloads\dự án ai\routes\focusChat.js`

Routes cho FocusChat API

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\routes\focusChat.js
const express = require('express');
const router = express.Router();
const FocusChatManager = require('../services/focusChatManager');

const manager = new FocusChatManager(process.env.OPENAI_API_KEY);

// Tạo phòng học
router.post('/rooms', async (req, res) => {
  try {
    const room = await manager.createRoom(req.body);
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Gửi tin nhắn + AI phân tích
router.post('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { userId, userName, content } = req.body;
    const result = await manager.processMessage(req.params.roomId, userId, userName, content);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Lấy tóm tắt
router.post('/rooms/:roomId/summary', async (req, res) => {
  try {
    const summary = await manager.generateSummary(req.params.roomId);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Bảng xếp hạng
router.get('/rooms/:roomId/leaderboard', async (req, res) => {
  try {
    const leaderboard = await manager.getLeaderboard(req.params.roomId);
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Kiểm tra gợi ý câu hỏi
router.get('/rooms/:roomId/check-suggestion', async (req, res) => {
  try {
    const suggestion = await manager.checkAndSuggestQuestion(req.params.roomId);
    res.json({ success: true, data: suggestion });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

---

### 5. `c:\Users\nh\Downloads\dự án ai\public\focusChat.html`

Giao diện FocusChat

```html
<!-- filepath: c:\Users\nh\Downloads\dự án ai\public\focusChat.html -->
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FocusChat - Phòng Học Nhóm</title>
  <style>
    * { margin: 0; padding: 
```


## License: unknown
https://github.com/tvloc38/web-fullstack/blob/e6d5114b97a1c73410eb44c61bcce96b19f65496/nodejs/HTML%20CSS/index.html

```
# 🚀 Nâng cấp StudyMate AI - Tích hợp FocusChat

Tôi sẽ giúp bạn tích hợp module **FocusChat** vào StudyMate AI. Đây là quy trình từng bước:

## 📋 Kế hoạch thực hiện

1. **Tạo model dữ liệu** cho phòng học & tin nhắn
2. **Tích hợp API AI** để phân loại nội dung
3. **Xây dựng logic giám sát** (warning → limit → lock)
4. **Tạo UI cho FocusChat**
5. **Tính năng đặc biệt**: Tóm tắt, gợi ý, hệ thống điểm

---

## 📁 Các file cần tạo/chỉnh sửa

### 1. `c:\Users\nh\Downloads\dự án ai\models\FocusChat.js`

Model cho phòng học với giám sát AI

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\models\FocusChat.js
const mongoose = require('mongoose');

// Schema cho tin nhắn
const messageSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
  contentType: { type: String, enum: ['learning', 'non-learning', 'spam'], default: null },
  aiAnalysis: {
    relevanceScore: Number, // 0-100
    category: String,
    warning: Boolean,
    suggestedEdit: String
  },
  isEdited: Boolean,
  editedContent: String
});

// Schema cho phòng học
const focusChatRoomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true },
  roomName: String,
  subject: { type: String, enum: ['Toán', 'Văn', 'Anh', 'Lý', 'Hóa', 'Sinh'] },
  createdBy: String,
  members: [
    {
      userId: String,
      userName: String,
      joinedAt: { type: Date, default: Date.now },
      warningCount: { type: Number, default: 0 },
      lockUntil: Date,
      points: { type: Number, default: 0 },
      role: { type: String, enum: ['teacher', 'student'], default: 'student' }
    }
  ],
  messages: [messageSchema],
  roomStatus: { type: String, enum: ['active', 'archived'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  summary: {
    lastSummaryAt: Date,
    content: String,
    pdfUrl: String
  },
  lastActivityAt: { type: Date, default: Date.now },
  silenceStartTime: Date // Để track khi nào bắt đầu im lặng
});

// Schema cho lịch sử vi phạm
const violationHistorySchema = new mongoose.Schema({
  userId: String,
  roomId: String,
  violationType: { type: String, enum: ['warning', 'limit', 'lock'], default: 'warning' },
  messageId: String,
  violatedContent: String,
  timestamp: { type: Date, default: Date.now },
  lockDuration: Number // phút
});

module.exports = {
  FocusRoom: mongoose.model('FocusRoom', focusChatRoomSchema),
  Violation: mongoose.model('Violation', violationHistorySchema)
};
```

---

### 2. `c:\Users\nh\Downloads\dự án ai\services\aiContentAnalyzer.js`

Service phân tích nội dung bằng AI

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\services\aiContentAnalyzer.js
const axios = require('axios');

class AIContentAnalyzer {
  constructor(apiKey, provider = 'openai') {
    this.apiKey = apiKey;
    this.provider = provider;
  }

  async analyzeMessage(message, subject) {
    try {
      let response;

      if (this.provider === 'openai') {
        response = await this._analyzeWithOpenAI(message, subject);
      } else if (this.provider === 'google') {
        response = await this._analyzeWithGoogle(message, subject);
      }

      return response;
    } catch (error) {
      console.error('AI Analysis Error:', error);
      return this._defaultAnalysis();
    }
  }

  async _analyzeWithOpenAI(message, subject) {
    const prompt = `
    Phân tích tin nhắn sau trong ngữ cảnh phòng học môn "${subject}".
    
    Tin nhắn: "${message}"
    
    Trả lại JSON với:
    {
      "contentType": "learning" | "non-learning" | "spam",
      "relevanceScore": 0-100,
      "category": "kiến thức" | "bài tập" | "thảo luận" | "không liên quan" | "spam",
      "isApproved": true/false,
      "suggestedEdit": "đề xuất sửa (nếu cần)",
      "reason": "lý do phân loại"
    }`;

    const res = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Bạn là trợ lý giáo dục phân tích nội dung học tập'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return JSON.parse(res.data.choices[0].message.content);
  }

  async _analyzeWithGoogle(message, subject) {
    // Tương tự cho Google API
    // TODO: Implement Google API
    return this._defaultAnalysis();
  }

  _defaultAnalysis() {
    return {
      contentType: 'non-learning',
      relevanceScore: 50,
      category: 'unknown',
      isApproved: true,
      suggestedEdit: null,
      reason: 'Không thể phân tích'
    };
  }
}

module.exports = AIContentAnalyzer;
```

---

### 3. `c:\Users\nh\Downloads\dự án ai\services\focusChatManager.js`

Logic giám sát & kiểm soát

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\services\focusChatManager.js
const { FocusRoom, Violation } = require('../models/FocusChat');
const AIContentAnalyzer = require('./aiContentAnalyzer');

class FocusChatManager {
  constructor(aiApiKey, provider = 'openai') {
    this.analyzer = new AIContentAnalyzer(aiApiKey, provider);
  }

  // Tạo phòng học mới
  async createRoom(roomData) {
    const newRoom = new FocusRoom({
      roomId: `room_${Date.now()}`,
      roomName: roomData.roomName,
      subject: roomData.subject,
      createdBy: roomData.createdBy,
      members: [{
        userId: roomData.createdBy,
        userName: roomData.creatorName,
        role: 'teacher'
      }]
    });

    return await newRoom.save();
  }

  // Xử lý tin nhắn + AI phân tích
  async processMessage(roomId, userId, userName, content) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room) throw new Error('Room not found');

    // Kiểm tra user bị khóa
    const member = room.members.find(m => m.userId === userId);
    if (member?.lockUntil && new Date() < member.lockUntil) {
      return {
        status: 'locked',
        message: '⏳ Bạn bị khóa tạm thời. Vui lòng chờ đến: ' + member.lockUntil,
        lockUntil: member.lockUntil
      };
    }

    // AI phân tích nội dung
    const analysis = await this.analyzer.analyzeMessage(content, room.subject);

    // Quyết định hành động
    const action = this._determineAction(member.warningCount, analysis.contentType);

    const messageDoc = {
      userId,
      userName,
      content,
      contentType: analysis.contentType,
      aiAnalysis: analysis,
      timestamp: new Date()
    };

    // Xử lý theo mức độ vi phạm
    if (analysis.contentType === 'learning') {
      // ✅ Nội dung tốt - Công 5 điểm
      messageDoc.warning = false;
      member.points += 5;
    } else if (analysis.contentType === 'non-learning') {
      messageDoc.warning = true;

      if (action === 'warning_1') {
        // 🟢 Mức 1: Nhắc nhở
        room.messages.push(messageDoc);
        await room.save();

        return {
          status: 'warning',
          level: 1,
          message: '⚠️ Tin nhắn này có vẻ không liên quan đến chủ đề học tập. Bạn có muốn chỉnh sửa không?',
          suggestedEdit: analysis.suggestedEdit,
          warningCount: member.warningCount + 1
        };
      } else if (action === 'limit') {
        // 🟡 Mức 2: Giới hạn
        member.warningCount += 1;
        member.points -= 10;
        room.messages.push(messageDoc);
        await room.save();

        return {
          status: 'limit',
          level: 2,
          message: '⏱️ Giới hạn: 1 tin nhắn/2 phút trong 5 phút tới',
          warningCount: member.warningCount
        };
      } else if (action === 'lock') {
        // 🔴 Mức 3: Khóa
        const lockDuration = this._calculateLockDuration(member.warningCount);
        member.lockUntil = new Date(Date.now() + lockDuration * 60000);
        member.warningCount = 0;
        member.points -= 20;

        await new Violation({
          userId,
          roomId,
          violationType: 'lock',
          messageId: undefined,
          violatedContent: content,
          lockDuration: lockDuration
        }).save();

        await room.save();

        return {
          status: 'locked',
          level: 3,
          lockDuration,
          message: `🔒 Bạn bị khóa ${lockDuration} phút vì vi phạm nhiều lần`,
          lockUntil: member.lockUntil
        };
      }
    }

    // Thêm tin nhắn vào room
    room.messages.push(messageDoc);
    room.lastActivityAt = new Date();

    // Reset silence timer
    room.silenceStartTime = null;

    await room.save();

    return {
      status: 'success',
      messageId: messageDoc._id,
      points: member.points
    };
  }

  // Xác định hành động dựa trên số lần cảnh báo
  _determineAction(warningCount, contentType) {
    if (contentType === 'learning') return 'approve';
    if (warningCount === 0) return 'warning_1';
    if (warningCount === 1) return 'limit';
    return 'lock';
  }

  // Tính thời gian khóa tăng dần
  _calculateLockDuration(warningCount) {
    const durations = [30, 60, 1440]; // 30 min, 1h, 24h
    return durations[Math.min(warningCount, 2)];
  }

  // AI tự động tóm tắt sau 60 phút
  async generateSummary(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room) throw new Error('Room not found');

    const recentMessages = room.messages.filter(msg => {
      const age = Date.now() - msg.timestamp;
      return age < 3600000; // 60 phút
    });

    const messageTexts = recentMessages
      .map(m => `${m.userName}: ${m.content}`)
      .join('\n');

    const summaryPrompt = `
    Tóm tắt nội dung chính đã thảo luận trong phòng học môn "${room.subject}":
    
    ${messageTexts}
    
    Hãy tạo bản tóm tắt gọn gàng, có cấu trúc, giúp học sinh ôn tập lại nội dung chính.
    `;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: summaryPrompt
      }]
    }, {
      headers: { 'Authorization': `Bearer ${this.analyzer.apiKey}` }
    });

    const summaryContent = response.data.choices[0].message.content;

    room.summary = {
      lastSummaryAt: new Date(),
      content: summaryContent,
      pdfUrl: null // TODO: Generate PDF
    };

    await room.save();
    return summaryContent;
  }

  // Gợi ý khi nhóm im lặng > 10 phút
  async checkAndSuggestQuestion(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room || room.messages.length === 0) return null;

    const lastMessage = room.messages[room.messages.length - 1];
    const silenceTime = Date.now() - new Date(lastMessage.timestamp);

    if (silenceTime > 600000) { // 10 phút
      // TODO: Generate câu hỏi liên quan từ AI
      return {
        suggestion: '📚 Mọi người có muốn làm thêm 1 bài tập vận dụng không?',
        type: 'question_suggestion'
      };
    }

    return null;
  }

  // Lấy bảng xếp hạng
  async getLeaderboard(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    return room.members
      .sort((a, b) => b.points - a.points)
      .map((m, idx) => ({
        rank: idx + 1,
        name: m.userName,
        points: m.points,
        warningCount: m.warningCount
      }));
  }
}

module.exports = FocusChatManager;
```

---

### 4. `c:\Users\nh\Downloads\dự án ai\routes\focusChat.js`

Routes cho FocusChat API

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\routes\focusChat.js
const express = require('express');
const router = express.Router();
const FocusChatManager = require('../services/focusChatManager');

const manager = new FocusChatManager(process.env.OPENAI_API_KEY);

// Tạo phòng học
router.post('/rooms', async (req, res) => {
  try {
    const room = await manager.createRoom(req.body);
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Gửi tin nhắn + AI phân tích
router.post('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { userId, userName, content } = req.body;
    const result = await manager.processMessage(req.params.roomId, userId, userName, content);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Lấy tóm tắt
router.post('/rooms/:roomId/summary', async (req, res) => {
  try {
    const summary = await manager.generateSummary(req.params.roomId);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Bảng xếp hạng
router.get('/rooms/:roomId/leaderboard', async (req, res) => {
  try {
    const leaderboard = await manager.getLeaderboard(req.params.roomId);
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Kiểm tra gợi ý câu hỏi
router.get('/rooms/:roomId/check-suggestion', async (req, res) => {
  try {
    const suggestion = await manager.checkAndSuggestQuestion(req.params.roomId);
    res.json({ success: true, data: suggestion });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

---

### 5. `c:\Users\nh\Downloads\dự án ai\public\focusChat.html`

Giao diện FocusChat

```html
<!-- filepath: c:\Users\nh\Downloads\dự án ai\public\focusChat.html -->
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FocusChat - Phòng Học Nhóm</title>
  <style>
    * { margin: 0; padding: 
```


## License: unknown
https://github.com/tvloc38/web-fullstack/blob/e6d5114b97a1c73410eb44c61bcce96b19f65496/nodejs/HTML%20CSS/index.html

```
# 🚀 Nâng cấp StudyMate AI - Tích hợp FocusChat

Tôi sẽ giúp bạn tích hợp module **FocusChat** vào StudyMate AI. Đây là quy trình từng bước:

## 📋 Kế hoạch thực hiện

1. **Tạo model dữ liệu** cho phòng học & tin nhắn
2. **Tích hợp API AI** để phân loại nội dung
3. **Xây dựng logic giám sát** (warning → limit → lock)
4. **Tạo UI cho FocusChat**
5. **Tính năng đặc biệt**: Tóm tắt, gợi ý, hệ thống điểm

---

## 📁 Các file cần tạo/chỉnh sửa

### 1. `c:\Users\nh\Downloads\dự án ai\models\FocusChat.js`

Model cho phòng học với giám sát AI

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\models\FocusChat.js
const mongoose = require('mongoose');

// Schema cho tin nhắn
const messageSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
  contentType: { type: String, enum: ['learning', 'non-learning', 'spam'], default: null },
  aiAnalysis: {
    relevanceScore: Number, // 0-100
    category: String,
    warning: Boolean,
    suggestedEdit: String
  },
  isEdited: Boolean,
  editedContent: String
});

// Schema cho phòng học
const focusChatRoomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true },
  roomName: String,
  subject: { type: String, enum: ['Toán', 'Văn', 'Anh', 'Lý', 'Hóa', 'Sinh'] },
  createdBy: String,
  members: [
    {
      userId: String,
      userName: String,
      joinedAt: { type: Date, default: Date.now },
      warningCount: { type: Number, default: 0 },
      lockUntil: Date,
      points: { type: Number, default: 0 },
      role: { type: String, enum: ['teacher', 'student'], default: 'student' }
    }
  ],
  messages: [messageSchema],
  roomStatus: { type: String, enum: ['active', 'archived'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  summary: {
    lastSummaryAt: Date,
    content: String,
    pdfUrl: String
  },
  lastActivityAt: { type: Date, default: Date.now },
  silenceStartTime: Date // Để track khi nào bắt đầu im lặng
});

// Schema cho lịch sử vi phạm
const violationHistorySchema = new mongoose.Schema({
  userId: String,
  roomId: String,
  violationType: { type: String, enum: ['warning', 'limit', 'lock'], default: 'warning' },
  messageId: String,
  violatedContent: String,
  timestamp: { type: Date, default: Date.now },
  lockDuration: Number // phút
});

module.exports = {
  FocusRoom: mongoose.model('FocusRoom', focusChatRoomSchema),
  Violation: mongoose.model('Violation', violationHistorySchema)
};
```

---

### 2. `c:\Users\nh\Downloads\dự án ai\services\aiContentAnalyzer.js`

Service phân tích nội dung bằng AI

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\services\aiContentAnalyzer.js
const axios = require('axios');

class AIContentAnalyzer {
  constructor(apiKey, provider = 'openai') {
    this.apiKey = apiKey;
    this.provider = provider;
  }

  async analyzeMessage(message, subject) {
    try {
      let response;

      if (this.provider === 'openai') {
        response = await this._analyzeWithOpenAI(message, subject);
      } else if (this.provider === 'google') {
        response = await this._analyzeWithGoogle(message, subject);
      }

      return response;
    } catch (error) {
      console.error('AI Analysis Error:', error);
      return this._defaultAnalysis();
    }
  }

  async _analyzeWithOpenAI(message, subject) {
    const prompt = `
    Phân tích tin nhắn sau trong ngữ cảnh phòng học môn "${subject}".
    
    Tin nhắn: "${message}"
    
    Trả lại JSON với:
    {
      "contentType": "learning" | "non-learning" | "spam",
      "relevanceScore": 0-100,
      "category": "kiến thức" | "bài tập" | "thảo luận" | "không liên quan" | "spam",
      "isApproved": true/false,
      "suggestedEdit": "đề xuất sửa (nếu cần)",
      "reason": "lý do phân loại"
    }`;

    const res = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Bạn là trợ lý giáo dục phân tích nội dung học tập'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return JSON.parse(res.data.choices[0].message.content);
  }

  async _analyzeWithGoogle(message, subject) {
    // Tương tự cho Google API
    // TODO: Implement Google API
    return this._defaultAnalysis();
  }

  _defaultAnalysis() {
    return {
      contentType: 'non-learning',
      relevanceScore: 50,
      category: 'unknown',
      isApproved: true,
      suggestedEdit: null,
      reason: 'Không thể phân tích'
    };
  }
}

module.exports = AIContentAnalyzer;
```

---

### 3. `c:\Users\nh\Downloads\dự án ai\services\focusChatManager.js`

Logic giám sát & kiểm soát

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\services\focusChatManager.js
const { FocusRoom, Violation } = require('../models/FocusChat');
const AIContentAnalyzer = require('./aiContentAnalyzer');

class FocusChatManager {
  constructor(aiApiKey, provider = 'openai') {
    this.analyzer = new AIContentAnalyzer(aiApiKey, provider);
  }

  // Tạo phòng học mới
  async createRoom(roomData) {
    const newRoom = new FocusRoom({
      roomId: `room_${Date.now()}`,
      roomName: roomData.roomName,
      subject: roomData.subject,
      createdBy: roomData.createdBy,
      members: [{
        userId: roomData.createdBy,
        userName: roomData.creatorName,
        role: 'teacher'
      }]
    });

    return await newRoom.save();
  }

  // Xử lý tin nhắn + AI phân tích
  async processMessage(roomId, userId, userName, content) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room) throw new Error('Room not found');

    // Kiểm tra user bị khóa
    const member = room.members.find(m => m.userId === userId);
    if (member?.lockUntil && new Date() < member.lockUntil) {
      return {
        status: 'locked',
        message: '⏳ Bạn bị khóa tạm thời. Vui lòng chờ đến: ' + member.lockUntil,
        lockUntil: member.lockUntil
      };
    }

    // AI phân tích nội dung
    const analysis = await this.analyzer.analyzeMessage(content, room.subject);

    // Quyết định hành động
    const action = this._determineAction(member.warningCount, analysis.contentType);

    const messageDoc = {
      userId,
      userName,
      content,
      contentType: analysis.contentType,
      aiAnalysis: analysis,
      timestamp: new Date()
    };

    // Xử lý theo mức độ vi phạm
    if (analysis.contentType === 'learning') {
      // ✅ Nội dung tốt - Công 5 điểm
      messageDoc.warning = false;
      member.points += 5;
    } else if (analysis.contentType === 'non-learning') {
      messageDoc.warning = true;

      if (action === 'warning_1') {
        // 🟢 Mức 1: Nhắc nhở
        room.messages.push(messageDoc);
        await room.save();

        return {
          status: 'warning',
          level: 1,
          message: '⚠️ Tin nhắn này có vẻ không liên quan đến chủ đề học tập. Bạn có muốn chỉnh sửa không?',
          suggestedEdit: analysis.suggestedEdit,
          warningCount: member.warningCount + 1
        };
      } else if (action === 'limit') {
        // 🟡 Mức 2: Giới hạn
        member.warningCount += 1;
        member.points -= 10;
        room.messages.push(messageDoc);
        await room.save();

        return {
          status: 'limit',
          level: 2,
          message: '⏱️ Giới hạn: 1 tin nhắn/2 phút trong 5 phút tới',
          warningCount: member.warningCount
        };
      } else if (action === 'lock') {
        // 🔴 Mức 3: Khóa
        const lockDuration = this._calculateLockDuration(member.warningCount);
        member.lockUntil = new Date(Date.now() + lockDuration * 60000);
        member.warningCount = 0;
        member.points -= 20;

        await new Violation({
          userId,
          roomId,
          violationType: 'lock',
          messageId: undefined,
          violatedContent: content,
          lockDuration: lockDuration
        }).save();

        await room.save();

        return {
          status: 'locked',
          level: 3,
          lockDuration,
          message: `🔒 Bạn bị khóa ${lockDuration} phút vì vi phạm nhiều lần`,
          lockUntil: member.lockUntil
        };
      }
    }

    // Thêm tin nhắn vào room
    room.messages.push(messageDoc);
    room.lastActivityAt = new Date();

    // Reset silence timer
    room.silenceStartTime = null;

    await room.save();

    return {
      status: 'success',
      messageId: messageDoc._id,
      points: member.points
    };
  }

  // Xác định hành động dựa trên số lần cảnh báo
  _determineAction(warningCount, contentType) {
    if (contentType === 'learning') return 'approve';
    if (warningCount === 0) return 'warning_1';
    if (warningCount === 1) return 'limit';
    return 'lock';
  }

  // Tính thời gian khóa tăng dần
  _calculateLockDuration(warningCount) {
    const durations = [30, 60, 1440]; // 30 min, 1h, 24h
    return durations[Math.min(warningCount, 2)];
  }

  // AI tự động tóm tắt sau 60 phút
  async generateSummary(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room) throw new Error('Room not found');

    const recentMessages = room.messages.filter(msg => {
      const age = Date.now() - msg.timestamp;
      return age < 3600000; // 60 phút
    });

    const messageTexts = recentMessages
      .map(m => `${m.userName}: ${m.content}`)
      .join('\n');

    const summaryPrompt = `
    Tóm tắt nội dung chính đã thảo luận trong phòng học môn "${room.subject}":
    
    ${messageTexts}
    
    Hãy tạo bản tóm tắt gọn gàng, có cấu trúc, giúp học sinh ôn tập lại nội dung chính.
    `;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: summaryPrompt
      }]
    }, {
      headers: { 'Authorization': `Bearer ${this.analyzer.apiKey}` }
    });

    const summaryContent = response.data.choices[0].message.content;

    room.summary = {
      lastSummaryAt: new Date(),
      content: summaryContent,
      pdfUrl: null // TODO: Generate PDF
    };

    await room.save();
    return summaryContent;
  }

  // Gợi ý khi nhóm im lặng > 10 phút
  async checkAndSuggestQuestion(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room || room.messages.length === 0) return null;

    const lastMessage = room.messages[room.messages.length - 1];
    const silenceTime = Date.now() - new Date(lastMessage.timestamp);

    if (silenceTime > 600000) { // 10 phút
      // TODO: Generate câu hỏi liên quan từ AI
      return {
        suggestion: '📚 Mọi người có muốn làm thêm 1 bài tập vận dụng không?',
        type: 'question_suggestion'
      };
    }

    return null;
  }

  // Lấy bảng xếp hạng
  async getLeaderboard(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    return room.members
      .sort((a, b) => b.points - a.points)
      .map((m, idx) => ({
        rank: idx + 1,
        name: m.userName,
        points: m.points,
        warningCount: m.warningCount
      }));
  }
}

module.exports = FocusChatManager;
```

---

### 4. `c:\Users\nh\Downloads\dự án ai\routes\focusChat.js`

Routes cho FocusChat API

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\routes\focusChat.js
const express = require('express');
const router = express.Router();
const FocusChatManager = require('../services/focusChatManager');

const manager = new FocusChatManager(process.env.OPENAI_API_KEY);

// Tạo phòng học
router.post('/rooms', async (req, res) => {
  try {
    const room = await manager.createRoom(req.body);
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Gửi tin nhắn + AI phân tích
router.post('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { userId, userName, content } = req.body;
    const result = await manager.processMessage(req.params.roomId, userId, userName, content);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Lấy tóm tắt
router.post('/rooms/:roomId/summary', async (req, res) => {
  try {
    const summary = await manager.generateSummary(req.params.roomId);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Bảng xếp hạng
router.get('/rooms/:roomId/leaderboard', async (req, res) => {
  try {
    const leaderboard = await manager.getLeaderboard(req.params.roomId);
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Kiểm tra gợi ý câu hỏi
router.get('/rooms/:roomId/check-suggestion', async (req, res) => {
  try {
    const suggestion = await manager.checkAndSuggestQuestion(req.params.roomId);
    res.json({ success: true, data: suggestion });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

---

### 5. `c:\Users\nh\Downloads\dự án ai\public\focusChat.html`

Giao diện FocusChat

```html
<!-- filepath: c:\Users\nh\Downloads\dự án ai\public\focusChat.html -->
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FocusChat - Phòng Học Nhóm</title>
  <style>
    * { margin: 0; padding: 
```


## License: unknown
https://github.com/tvloc38/web-fullstack/blob/e6d5114b97a1c73410eb44c61bcce96b19f65496/nodejs/HTML%20CSS/index.html

```
# 🚀 Nâng cấp StudyMate AI - Tích hợp FocusChat

Tôi sẽ giúp bạn tích hợp module **FocusChat** vào StudyMate AI. Đây là quy trình từng bước:

## 📋 Kế hoạch thực hiện

1. **Tạo model dữ liệu** cho phòng học & tin nhắn
2. **Tích hợp API AI** để phân loại nội dung
3. **Xây dựng logic giám sát** (warning → limit → lock)
4. **Tạo UI cho FocusChat**
5. **Tính năng đặc biệt**: Tóm tắt, gợi ý, hệ thống điểm

---

## 📁 Các file cần tạo/chỉnh sửa

### 1. `c:\Users\nh\Downloads\dự án ai\models\FocusChat.js`

Model cho phòng học với giám sát AI

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\models\FocusChat.js
const mongoose = require('mongoose');

// Schema cho tin nhắn
const messageSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
  contentType: { type: String, enum: ['learning', 'non-learning', 'spam'], default: null },
  aiAnalysis: {
    relevanceScore: Number, // 0-100
    category: String,
    warning: Boolean,
    suggestedEdit: String
  },
  isEdited: Boolean,
  editedContent: String
});

// Schema cho phòng học
const focusChatRoomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true },
  roomName: String,
  subject: { type: String, enum: ['Toán', 'Văn', 'Anh', 'Lý', 'Hóa', 'Sinh'] },
  createdBy: String,
  members: [
    {
      userId: String,
      userName: String,
      joinedAt: { type: Date, default: Date.now },
      warningCount: { type: Number, default: 0 },
      lockUntil: Date,
      points: { type: Number, default: 0 },
      role: { type: String, enum: ['teacher', 'student'], default: 'student' }
    }
  ],
  messages: [messageSchema],
  roomStatus: { type: String, enum: ['active', 'archived'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  summary: {
    lastSummaryAt: Date,
    content: String,
    pdfUrl: String
  },
  lastActivityAt: { type: Date, default: Date.now },
  silenceStartTime: Date // Để track khi nào bắt đầu im lặng
});

// Schema cho lịch sử vi phạm
const violationHistorySchema = new mongoose.Schema({
  userId: String,
  roomId: String,
  violationType: { type: String, enum: ['warning', 'limit', 'lock'], default: 'warning' },
  messageId: String,
  violatedContent: String,
  timestamp: { type: Date, default: Date.now },
  lockDuration: Number // phút
});

module.exports = {
  FocusRoom: mongoose.model('FocusRoom', focusChatRoomSchema),
  Violation: mongoose.model('Violation', violationHistorySchema)
};
```

---

### 2. `c:\Users\nh\Downloads\dự án ai\services\aiContentAnalyzer.js`

Service phân tích nội dung bằng AI

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\services\aiContentAnalyzer.js
const axios = require('axios');

class AIContentAnalyzer {
  constructor(apiKey, provider = 'openai') {
    this.apiKey = apiKey;
    this.provider = provider;
  }

  async analyzeMessage(message, subject) {
    try {
      let response;

      if (this.provider === 'openai') {
        response = await this._analyzeWithOpenAI(message, subject);
      } else if (this.provider === 'google') {
        response = await this._analyzeWithGoogle(message, subject);
      }

      return response;
    } catch (error) {
      console.error('AI Analysis Error:', error);
      return this._defaultAnalysis();
    }
  }

  async _analyzeWithOpenAI(message, subject) {
    const prompt = `
    Phân tích tin nhắn sau trong ngữ cảnh phòng học môn "${subject}".
    
    Tin nhắn: "${message}"
    
    Trả lại JSON với:
    {
      "contentType": "learning" | "non-learning" | "spam",
      "relevanceScore": 0-100,
      "category": "kiến thức" | "bài tập" | "thảo luận" | "không liên quan" | "spam",
      "isApproved": true/false,
      "suggestedEdit": "đề xuất sửa (nếu cần)",
      "reason": "lý do phân loại"
    }`;

    const res = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Bạn là trợ lý giáo dục phân tích nội dung học tập'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return JSON.parse(res.data.choices[0].message.content);
  }

  async _analyzeWithGoogle(message, subject) {
    // Tương tự cho Google API
    // TODO: Implement Google API
    return this._defaultAnalysis();
  }

  _defaultAnalysis() {
    return {
      contentType: 'non-learning',
      relevanceScore: 50,
      category: 'unknown',
      isApproved: true,
      suggestedEdit: null,
      reason: 'Không thể phân tích'
    };
  }
}

module.exports = AIContentAnalyzer;
```

---

### 3. `c:\Users\nh\Downloads\dự án ai\services\focusChatManager.js`

Logic giám sát & kiểm soát

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\services\focusChatManager.js
const { FocusRoom, Violation } = require('../models/FocusChat');
const AIContentAnalyzer = require('./aiContentAnalyzer');

class FocusChatManager {
  constructor(aiApiKey, provider = 'openai') {
    this.analyzer = new AIContentAnalyzer(aiApiKey, provider);
  }

  // Tạo phòng học mới
  async createRoom(roomData) {
    const newRoom = new FocusRoom({
      roomId: `room_${Date.now()}`,
      roomName: roomData.roomName,
      subject: roomData.subject,
      createdBy: roomData.createdBy,
      members: [{
        userId: roomData.createdBy,
        userName: roomData.creatorName,
        role: 'teacher'
      }]
    });

    return await newRoom.save();
  }

  // Xử lý tin nhắn + AI phân tích
  async processMessage(roomId, userId, userName, content) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room) throw new Error('Room not found');

    // Kiểm tra user bị khóa
    const member = room.members.find(m => m.userId === userId);
    if (member?.lockUntil && new Date() < member.lockUntil) {
      return {
        status: 'locked',
        message: '⏳ Bạn bị khóa tạm thời. Vui lòng chờ đến: ' + member.lockUntil,
        lockUntil: member.lockUntil
      };
    }

    // AI phân tích nội dung
    const analysis = await this.analyzer.analyzeMessage(content, room.subject);

    // Quyết định hành động
    const action = this._determineAction(member.warningCount, analysis.contentType);

    const messageDoc = {
      userId,
      userName,
      content,
      contentType: analysis.contentType,
      aiAnalysis: analysis,
      timestamp: new Date()
    };

    // Xử lý theo mức độ vi phạm
    if (analysis.contentType === 'learning') {
      // ✅ Nội dung tốt - Công 5 điểm
      messageDoc.warning = false;
      member.points += 5;
    } else if (analysis.contentType === 'non-learning') {
      messageDoc.warning = true;

      if (action === 'warning_1') {
        // 🟢 Mức 1: Nhắc nhở
        room.messages.push(messageDoc);
        await room.save();

        return {
          status: 'warning',
          level: 1,
          message: '⚠️ Tin nhắn này có vẻ không liên quan đến chủ đề học tập. Bạn có muốn chỉnh sửa không?',
          suggestedEdit: analysis.suggestedEdit,
          warningCount: member.warningCount + 1
        };
      } else if (action === 'limit') {
        // 🟡 Mức 2: Giới hạn
        member.warningCount += 1;
        member.points -= 10;
        room.messages.push(messageDoc);
        await room.save();

        return {
          status: 'limit',
          level: 2,
          message: '⏱️ Giới hạn: 1 tin nhắn/2 phút trong 5 phút tới',
          warningCount: member.warningCount
        };
      } else if (action === 'lock') {
        // 🔴 Mức 3: Khóa
        const lockDuration = this._calculateLockDuration(member.warningCount);
        member.lockUntil = new Date(Date.now() + lockDuration * 60000);
        member.warningCount = 0;
        member.points -= 20;

        await new Violation({
          userId,
          roomId,
          violationType: 'lock',
          messageId: undefined,
          violatedContent: content,
          lockDuration: lockDuration
        }).save();

        await room.save();

        return {
          status: 'locked',
          level: 3,
          lockDuration,
          message: `🔒 Bạn bị khóa ${lockDuration} phút vì vi phạm nhiều lần`,
          lockUntil: member.lockUntil
        };
      }
    }

    // Thêm tin nhắn vào room
    room.messages.push(messageDoc);
    room.lastActivityAt = new Date();

    // Reset silence timer
    room.silenceStartTime = null;

    await room.save();

    return {
      status: 'success',
      messageId: messageDoc._id,
      points: member.points
    };
  }

  // Xác định hành động dựa trên số lần cảnh báo
  _determineAction(warningCount, contentType) {
    if (contentType === 'learning') return 'approve';
    if (warningCount === 0) return 'warning_1';
    if (warningCount === 1) return 'limit';
    return 'lock';
  }

  // Tính thời gian khóa tăng dần
  _calculateLockDuration(warningCount) {
    const durations = [30, 60, 1440]; // 30 min, 1h, 24h
    return durations[Math.min(warningCount, 2)];
  }

  // AI tự động tóm tắt sau 60 phút
  async generateSummary(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room) throw new Error('Room not found');

    const recentMessages = room.messages.filter(msg => {
      const age = Date.now() - msg.timestamp;
      return age < 3600000; // 60 phút
    });

    const messageTexts = recentMessages
      .map(m => `${m.userName}: ${m.content}`)
      .join('\n');

    const summaryPrompt = `
    Tóm tắt nội dung chính đã thảo luận trong phòng học môn "${room.subject}":
    
    ${messageTexts}
    
    Hãy tạo bản tóm tắt gọn gàng, có cấu trúc, giúp học sinh ôn tập lại nội dung chính.
    `;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: summaryPrompt
      }]
    }, {
      headers: { 'Authorization': `Bearer ${this.analyzer.apiKey}` }
    });

    const summaryContent = response.data.choices[0].message.content;

    room.summary = {
      lastSummaryAt: new Date(),
      content: summaryContent,
      pdfUrl: null // TODO: Generate PDF
    };

    await room.save();
    return summaryContent;
  }

  // Gợi ý khi nhóm im lặng > 10 phút
  async checkAndSuggestQuestion(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room || room.messages.length === 0) return null;

    const lastMessage = room.messages[room.messages.length - 1];
    const silenceTime = Date.now() - new Date(lastMessage.timestamp);

    if (silenceTime > 600000) { // 10 phút
      // TODO: Generate câu hỏi liên quan từ AI
      return {
        suggestion: '📚 Mọi người có muốn làm thêm 1 bài tập vận dụng không?',
        type: 'question_suggestion'
      };
    }

    return null;
  }

  // Lấy bảng xếp hạng
  async getLeaderboard(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    return room.members
      .sort((a, b) => b.points - a.points)
      .map((m, idx) => ({
        rank: idx + 1,
        name: m.userName,
        points: m.points,
        warningCount: m.warningCount
      }));
  }
}

module.exports = FocusChatManager;
```

---

### 4. `c:\Users\nh\Downloads\dự án ai\routes\focusChat.js`

Routes cho FocusChat API

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\routes\focusChat.js
const express = require('express');
const router = express.Router();
const FocusChatManager = require('../services/focusChatManager');

const manager = new FocusChatManager(process.env.OPENAI_API_KEY);

// Tạo phòng học
router.post('/rooms', async (req, res) => {
  try {
    const room = await manager.createRoom(req.body);
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Gửi tin nhắn + AI phân tích
router.post('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { userId, userName, content } = req.body;
    const result = await manager.processMessage(req.params.roomId, userId, userName, content);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Lấy tóm tắt
router.post('/rooms/:roomId/summary', async (req, res) => {
  try {
    const summary = await manager.generateSummary(req.params.roomId);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Bảng xếp hạng
router.get('/rooms/:roomId/leaderboard', async (req, res) => {
  try {
    const leaderboard = await manager.getLeaderboard(req.params.roomId);
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Kiểm tra gợi ý câu hỏi
router.get('/rooms/:roomId/check-suggestion', async (req, res) => {
  try {
    const suggestion = await manager.checkAndSuggestQuestion(req.params.roomId);
    res.json({ success: true, data: suggestion });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

---

### 5. `c:\Users\nh\Downloads\dự án ai\public\focusChat.html`

Giao diện FocusChat

```html
<!-- filepath: c:\Users\nh\Downloads\dự án ai\public\focusChat.html -->
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FocusChat - Phòng Học Nhóm</title>
  <style>
    * { margin: 0; padding: 
```


## License: unknown
https://github.com/tvloc38/web-fullstack/blob/e6d5114b97a1c73410eb44c61bcce96b19f65496/nodejs/HTML%20CSS/index.html

```
# 🚀 Nâng cấp StudyMate AI - Tích hợp FocusChat

Tôi sẽ giúp bạn tích hợp module **FocusChat** vào StudyMate AI. Đây là quy trình từng bước:

## 📋 Kế hoạch thực hiện

1. **Tạo model dữ liệu** cho phòng học & tin nhắn
2. **Tích hợp API AI** để phân loại nội dung
3. **Xây dựng logic giám sát** (warning → limit → lock)
4. **Tạo UI cho FocusChat**
5. **Tính năng đặc biệt**: Tóm tắt, gợi ý, hệ thống điểm

---

## 📁 Các file cần tạo/chỉnh sửa

### 1. `c:\Users\nh\Downloads\dự án ai\models\FocusChat.js`

Model cho phòng học với giám sát AI

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\models\FocusChat.js
const mongoose = require('mongoose');

// Schema cho tin nhắn
const messageSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
  contentType: { type: String, enum: ['learning', 'non-learning', 'spam'], default: null },
  aiAnalysis: {
    relevanceScore: Number, // 0-100
    category: String,
    warning: Boolean,
    suggestedEdit: String
  },
  isEdited: Boolean,
  editedContent: String
});

// Schema cho phòng học
const focusChatRoomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true },
  roomName: String,
  subject: { type: String, enum: ['Toán', 'Văn', 'Anh', 'Lý', 'Hóa', 'Sinh'] },
  createdBy: String,
  members: [
    {
      userId: String,
      userName: String,
      joinedAt: { type: Date, default: Date.now },
      warningCount: { type: Number, default: 0 },
      lockUntil: Date,
      points: { type: Number, default: 0 },
      role: { type: String, enum: ['teacher', 'student'], default: 'student' }
    }
  ],
  messages: [messageSchema],
  roomStatus: { type: String, enum: ['active', 'archived'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  summary: {
    lastSummaryAt: Date,
    content: String,
    pdfUrl: String
  },
  lastActivityAt: { type: Date, default: Date.now },
  silenceStartTime: Date // Để track khi nào bắt đầu im lặng
});

// Schema cho lịch sử vi phạm
const violationHistorySchema = new mongoose.Schema({
  userId: String,
  roomId: String,
  violationType: { type: String, enum: ['warning', 'limit', 'lock'], default: 'warning' },
  messageId: String,
  violatedContent: String,
  timestamp: { type: Date, default: Date.now },
  lockDuration: Number // phút
});

module.exports = {
  FocusRoom: mongoose.model('FocusRoom', focusChatRoomSchema),
  Violation: mongoose.model('Violation', violationHistorySchema)
};
```

---

### 2. `c:\Users\nh\Downloads\dự án ai\services\aiContentAnalyzer.js`

Service phân tích nội dung bằng AI

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\services\aiContentAnalyzer.js
const axios = require('axios');

class AIContentAnalyzer {
  constructor(apiKey, provider = 'openai') {
    this.apiKey = apiKey;
    this.provider = provider;
  }

  async analyzeMessage(message, subject) {
    try {
      let response;

      if (this.provider === 'openai') {
        response = await this._analyzeWithOpenAI(message, subject);
      } else if (this.provider === 'google') {
        response = await this._analyzeWithGoogle(message, subject);
      }

      return response;
    } catch (error) {
      console.error('AI Analysis Error:', error);
      return this._defaultAnalysis();
    }
  }

  async _analyzeWithOpenAI(message, subject) {
    const prompt = `
    Phân tích tin nhắn sau trong ngữ cảnh phòng học môn "${subject}".
    
    Tin nhắn: "${message}"
    
    Trả lại JSON với:
    {
      "contentType": "learning" | "non-learning" | "spam",
      "relevanceScore": 0-100,
      "category": "kiến thức" | "bài tập" | "thảo luận" | "không liên quan" | "spam",
      "isApproved": true/false,
      "suggestedEdit": "đề xuất sửa (nếu cần)",
      "reason": "lý do phân loại"
    }`;

    const res = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Bạn là trợ lý giáo dục phân tích nội dung học tập'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return JSON.parse(res.data.choices[0].message.content);
  }

  async _analyzeWithGoogle(message, subject) {
    // Tương tự cho Google API
    // TODO: Implement Google API
    return this._defaultAnalysis();
  }

  _defaultAnalysis() {
    return {
      contentType: 'non-learning',
      relevanceScore: 50,
      category: 'unknown',
      isApproved: true,
      suggestedEdit: null,
      reason: 'Không thể phân tích'
    };
  }
}

module.exports = AIContentAnalyzer;
```

---

### 3. `c:\Users\nh\Downloads\dự án ai\services\focusChatManager.js`

Logic giám sát & kiểm soát

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\services\focusChatManager.js
const { FocusRoom, Violation } = require('../models/FocusChat');
const AIContentAnalyzer = require('./aiContentAnalyzer');

class FocusChatManager {
  constructor(aiApiKey, provider = 'openai') {
    this.analyzer = new AIContentAnalyzer(aiApiKey, provider);
  }

  // Tạo phòng học mới
  async createRoom(roomData) {
    const newRoom = new FocusRoom({
      roomId: `room_${Date.now()}`,
      roomName: roomData.roomName,
      subject: roomData.subject,
      createdBy: roomData.createdBy,
      members: [{
        userId: roomData.createdBy,
        userName: roomData.creatorName,
        role: 'teacher'
      }]
    });

    return await newRoom.save();
  }

  // Xử lý tin nhắn + AI phân tích
  async processMessage(roomId, userId, userName, content) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room) throw new Error('Room not found');

    // Kiểm tra user bị khóa
    const member = room.members.find(m => m.userId === userId);
    if (member?.lockUntil && new Date() < member.lockUntil) {
      return {
        status: 'locked',
        message: '⏳ Bạn bị khóa tạm thời. Vui lòng chờ đến: ' + member.lockUntil,
        lockUntil: member.lockUntil
      };
    }

    // AI phân tích nội dung
    const analysis = await this.analyzer.analyzeMessage(content, room.subject);

    // Quyết định hành động
    const action = this._determineAction(member.warningCount, analysis.contentType);

    const messageDoc = {
      userId,
      userName,
      content,
      contentType: analysis.contentType,
      aiAnalysis: analysis,
      timestamp: new Date()
    };

    // Xử lý theo mức độ vi phạm
    if (analysis.contentType === 'learning') {
      // ✅ Nội dung tốt - Công 5 điểm
      messageDoc.warning = false;
      member.points += 5;
    } else if (analysis.contentType === 'non-learning') {
      messageDoc.warning = true;

      if (action === 'warning_1') {
        // 🟢 Mức 1: Nhắc nhở
        room.messages.push(messageDoc);
        await room.save();

        return {
          status: 'warning',
          level: 1,
          message: '⚠️ Tin nhắn này có vẻ không liên quan đến chủ đề học tập. Bạn có muốn chỉnh sửa không?',
          suggestedEdit: analysis.suggestedEdit,
          warningCount: member.warningCount + 1
        };
      } else if (action === 'limit') {
        // 🟡 Mức 2: Giới hạn
        member.warningCount += 1;
        member.points -= 10;
        room.messages.push(messageDoc);
        await room.save();

        return {
          status: 'limit',
          level: 2,
          message: '⏱️ Giới hạn: 1 tin nhắn/2 phút trong 5 phút tới',
          warningCount: member.warningCount
        };
      } else if (action === 'lock') {
        // 🔴 Mức 3: Khóa
        const lockDuration = this._calculateLockDuration(member.warningCount);
        member.lockUntil = new Date(Date.now() + lockDuration * 60000);
        member.warningCount = 0;
        member.points -= 20;

        await new Violation({
          userId,
          roomId,
          violationType: 'lock',
          messageId: undefined,
          violatedContent: content,
          lockDuration: lockDuration
        }).save();

        await room.save();

        return {
          status: 'locked',
          level: 3,
          lockDuration,
          message: `🔒 Bạn bị khóa ${lockDuration} phút vì vi phạm nhiều lần`,
          lockUntil: member.lockUntil
        };
      }
    }

    // Thêm tin nhắn vào room
    room.messages.push(messageDoc);
    room.lastActivityAt = new Date();

    // Reset silence timer
    room.silenceStartTime = null;

    await room.save();

    return {
      status: 'success',
      messageId: messageDoc._id,
      points: member.points
    };
  }

  // Xác định hành động dựa trên số lần cảnh báo
  _determineAction(warningCount, contentType) {
    if (contentType === 'learning') return 'approve';
    if (warningCount === 0) return 'warning_1';
    if (warningCount === 1) return 'limit';
    return 'lock';
  }

  // Tính thời gian khóa tăng dần
  _calculateLockDuration(warningCount) {
    const durations = [30, 60, 1440]; // 30 min, 1h, 24h
    return durations[Math.min(warningCount, 2)];
  }

  // AI tự động tóm tắt sau 60 phút
  async generateSummary(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room) throw new Error('Room not found');

    const recentMessages = room.messages.filter(msg => {
      const age = Date.now() - msg.timestamp;
      return age < 3600000; // 60 phút
    });

    const messageTexts = recentMessages
      .map(m => `${m.userName}: ${m.content}`)
      .join('\n');

    const summaryPrompt = `
    Tóm tắt nội dung chính đã thảo luận trong phòng học môn "${room.subject}":
    
    ${messageTexts}
    
    Hãy tạo bản tóm tắt gọn gàng, có cấu trúc, giúp học sinh ôn tập lại nội dung chính.
    `;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: summaryPrompt
      }]
    }, {
      headers: { 'Authorization': `Bearer ${this.analyzer.apiKey}` }
    });

    const summaryContent = response.data.choices[0].message.content;

    room.summary = {
      lastSummaryAt: new Date(),
      content: summaryContent,
      pdfUrl: null // TODO: Generate PDF
    };

    await room.save();
    return summaryContent;
  }

  // Gợi ý khi nhóm im lặng > 10 phút
  async checkAndSuggestQuestion(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room || room.messages.length === 0) return null;

    const lastMessage = room.messages[room.messages.length - 1];
    const silenceTime = Date.now() - new Date(lastMessage.timestamp);

    if (silenceTime > 600000) { // 10 phút
      // TODO: Generate câu hỏi liên quan từ AI
      return {
        suggestion: '📚 Mọi người có muốn làm thêm 1 bài tập vận dụng không?',
        type: 'question_suggestion'
      };
    }

    return null;
  }

  // Lấy bảng xếp hạng
  async getLeaderboard(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    return room.members
      .sort((a, b) => b.points - a.points)
      .map((m, idx) => ({
        rank: idx + 1,
        name: m.userName,
        points: m.points,
        warningCount: m.warningCount
      }));
  }
}

module.exports = FocusChatManager;
```

---

### 4. `c:\Users\nh\Downloads\dự án ai\routes\focusChat.js`

Routes cho FocusChat API

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\routes\focusChat.js
const express = require('express');
const router = express.Router();
const FocusChatManager = require('../services/focusChatManager');

const manager = new FocusChatManager(process.env.OPENAI_API_KEY);

// Tạo phòng học
router.post('/rooms', async (req, res) => {
  try {
    const room = await manager.createRoom(req.body);
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Gửi tin nhắn + AI phân tích
router.post('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { userId, userName, content } = req.body;
    const result = await manager.processMessage(req.params.roomId, userId, userName, content);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Lấy tóm tắt
router.post('/rooms/:roomId/summary', async (req, res) => {
  try {
    const summary = await manager.generateSummary(req.params.roomId);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Bảng xếp hạng
router.get('/rooms/:roomId/leaderboard', async (req, res) => {
  try {
    const leaderboard = await manager.getLeaderboard(req.params.roomId);
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Kiểm tra gợi ý câu hỏi
router.get('/rooms/:roomId/check-suggestion', async (req, res) => {
  try {
    const suggestion = await manager.checkAndSuggestQuestion(req.params.roomId);
    res.json({ success: true, data: suggestion });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

---

### 5. `c:\Users\nh\Downloads\dự án ai\public\focusChat.html`

Giao diện FocusChat

```html
<!-- filepath: c:\Users\nh\Downloads\dự án ai\public\focusChat.html -->
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FocusChat - Phòng Học Nhóm</title>
  <style>
    * { margin: 0; padding: 
```


## License: unknown
https://github.com/tvloc38/web-fullstack/blob/e6d5114b97a1c73410eb44c61bcce96b19f65496/nodejs/HTML%20CSS/index.html

```
# 🚀 Nâng cấp StudyMate AI - Tích hợp FocusChat

Tôi sẽ giúp bạn tích hợp module **FocusChat** vào StudyMate AI. Đây là quy trình từng bước:

## 📋 Kế hoạch thực hiện

1. **Tạo model dữ liệu** cho phòng học & tin nhắn
2. **Tích hợp API AI** để phân loại nội dung
3. **Xây dựng logic giám sát** (warning → limit → lock)
4. **Tạo UI cho FocusChat**
5. **Tính năng đặc biệt**: Tóm tắt, gợi ý, hệ thống điểm

---

## 📁 Các file cần tạo/chỉnh sửa

### 1. `c:\Users\nh\Downloads\dự án ai\models\FocusChat.js`

Model cho phòng học với giám sát AI

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\models\FocusChat.js
const mongoose = require('mongoose');

// Schema cho tin nhắn
const messageSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
  contentType: { type: String, enum: ['learning', 'non-learning', 'spam'], default: null },
  aiAnalysis: {
    relevanceScore: Number, // 0-100
    category: String,
    warning: Boolean,
    suggestedEdit: String
  },
  isEdited: Boolean,
  editedContent: String
});

// Schema cho phòng học
const focusChatRoomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true },
  roomName: String,
  subject: { type: String, enum: ['Toán', 'Văn', 'Anh', 'Lý', 'Hóa', 'Sinh'] },
  createdBy: String,
  members: [
    {
      userId: String,
      userName: String,
      joinedAt: { type: Date, default: Date.now },
      warningCount: { type: Number, default: 0 },
      lockUntil: Date,
      points: { type: Number, default: 0 },
      role: { type: String, enum: ['teacher', 'student'], default: 'student' }
    }
  ],
  messages: [messageSchema],
  roomStatus: { type: String, enum: ['active', 'archived'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  summary: {
    lastSummaryAt: Date,
    content: String,
    pdfUrl: String
  },
  lastActivityAt: { type: Date, default: Date.now },
  silenceStartTime: Date // Để track khi nào bắt đầu im lặng
});

// Schema cho lịch sử vi phạm
const violationHistorySchema = new mongoose.Schema({
  userId: String,
  roomId: String,
  violationType: { type: String, enum: ['warning', 'limit', 'lock'], default: 'warning' },
  messageId: String,
  violatedContent: String,
  timestamp: { type: Date, default: Date.now },
  lockDuration: Number // phút
});

module.exports = {
  FocusRoom: mongoose.model('FocusRoom', focusChatRoomSchema),
  Violation: mongoose.model('Violation', violationHistorySchema)
};
```

---

### 2. `c:\Users\nh\Downloads\dự án ai\services\aiContentAnalyzer.js`

Service phân tích nội dung bằng AI

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\services\aiContentAnalyzer.js
const axios = require('axios');

class AIContentAnalyzer {
  constructor(apiKey, provider = 'openai') {
    this.apiKey = apiKey;
    this.provider = provider;
  }

  async analyzeMessage(message, subject) {
    try {
      let response;

      if (this.provider === 'openai') {
        response = await this._analyzeWithOpenAI(message, subject);
      } else if (this.provider === 'google') {
        response = await this._analyzeWithGoogle(message, subject);
      }

      return response;
    } catch (error) {
      console.error('AI Analysis Error:', error);
      return this._defaultAnalysis();
    }
  }

  async _analyzeWithOpenAI(message, subject) {
    const prompt = `
    Phân tích tin nhắn sau trong ngữ cảnh phòng học môn "${subject}".
    
    Tin nhắn: "${message}"
    
    Trả lại JSON với:
    {
      "contentType": "learning" | "non-learning" | "spam",
      "relevanceScore": 0-100,
      "category": "kiến thức" | "bài tập" | "thảo luận" | "không liên quan" | "spam",
      "isApproved": true/false,
      "suggestedEdit": "đề xuất sửa (nếu cần)",
      "reason": "lý do phân loại"
    }`;

    const res = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Bạn là trợ lý giáo dục phân tích nội dung học tập'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return JSON.parse(res.data.choices[0].message.content);
  }

  async _analyzeWithGoogle(message, subject) {
    // Tương tự cho Google API
    // TODO: Implement Google API
    return this._defaultAnalysis();
  }

  _defaultAnalysis() {
    return {
      contentType: 'non-learning',
      relevanceScore: 50,
      category: 'unknown',
      isApproved: true,
      suggestedEdit: null,
      reason: 'Không thể phân tích'
    };
  }
}

module.exports = AIContentAnalyzer;
```

---

### 3. `c:\Users\nh\Downloads\dự án ai\services\focusChatManager.js`

Logic giám sát & kiểm soát

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\services\focusChatManager.js
const { FocusRoom, Violation } = require('../models/FocusChat');
const AIContentAnalyzer = require('./aiContentAnalyzer');

class FocusChatManager {
  constructor(aiApiKey, provider = 'openai') {
    this.analyzer = new AIContentAnalyzer(aiApiKey, provider);
  }

  // Tạo phòng học mới
  async createRoom(roomData) {
    const newRoom = new FocusRoom({
      roomId: `room_${Date.now()}`,
      roomName: roomData.roomName,
      subject: roomData.subject,
      createdBy: roomData.createdBy,
      members: [{
        userId: roomData.createdBy,
        userName: roomData.creatorName,
        role: 'teacher'
      }]
    });

    return await newRoom.save();
  }

  // Xử lý tin nhắn + AI phân tích
  async processMessage(roomId, userId, userName, content) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room) throw new Error('Room not found');

    // Kiểm tra user bị khóa
    const member = room.members.find(m => m.userId === userId);
    if (member?.lockUntil && new Date() < member.lockUntil) {
      return {
        status: 'locked',
        message: '⏳ Bạn bị khóa tạm thời. Vui lòng chờ đến: ' + member.lockUntil,
        lockUntil: member.lockUntil
      };
    }

    // AI phân tích nội dung
    const analysis = await this.analyzer.analyzeMessage(content, room.subject);

    // Quyết định hành động
    const action = this._determineAction(member.warningCount, analysis.contentType);

    const messageDoc = {
      userId,
      userName,
      content,
      contentType: analysis.contentType,
      aiAnalysis: analysis,
      timestamp: new Date()
    };

    // Xử lý theo mức độ vi phạm
    if (analysis.contentType === 'learning') {
      // ✅ Nội dung tốt - Công 5 điểm
      messageDoc.warning = false;
      member.points += 5;
    } else if (analysis.contentType === 'non-learning') {
      messageDoc.warning = true;

      if (action === 'warning_1') {
        // 🟢 Mức 1: Nhắc nhở
        room.messages.push(messageDoc);
        await room.save();

        return {
          status: 'warning',
          level: 1,
          message: '⚠️ Tin nhắn này có vẻ không liên quan đến chủ đề học tập. Bạn có muốn chỉnh sửa không?',
          suggestedEdit: analysis.suggestedEdit,
          warningCount: member.warningCount + 1
        };
      } else if (action === 'limit') {
        // 🟡 Mức 2: Giới hạn
        member.warningCount += 1;
        member.points -= 10;
        room.messages.push(messageDoc);
        await room.save();

        return {
          status: 'limit',
          level: 2,
          message: '⏱️ Giới hạn: 1 tin nhắn/2 phút trong 5 phút tới',
          warningCount: member.warningCount
        };
      } else if (action === 'lock') {
        // 🔴 Mức 3: Khóa
        const lockDuration = this._calculateLockDuration(member.warningCount);
        member.lockUntil = new Date(Date.now() + lockDuration * 60000);
        member.warningCount = 0;
        member.points -= 20;

        await new Violation({
          userId,
          roomId,
          violationType: 'lock',
          messageId: undefined,
          violatedContent: content,
          lockDuration: lockDuration
        }).save();

        await room.save();

        return {
          status: 'locked',
          level: 3,
          lockDuration,
          message: `🔒 Bạn bị khóa ${lockDuration} phút vì vi phạm nhiều lần`,
          lockUntil: member.lockUntil
        };
      }
    }

    // Thêm tin nhắn vào room
    room.messages.push(messageDoc);
    room.lastActivityAt = new Date();

    // Reset silence timer
    room.silenceStartTime = null;

    await room.save();

    return {
      status: 'success',
      messageId: messageDoc._id,
      points: member.points
    };
  }

  // Xác định hành động dựa trên số lần cảnh báo
  _determineAction(warningCount, contentType) {
    if (contentType === 'learning') return 'approve';
    if (warningCount === 0) return 'warning_1';
    if (warningCount === 1) return 'limit';
    return 'lock';
  }

  // Tính thời gian khóa tăng dần
  _calculateLockDuration(warningCount) {
    const durations = [30, 60, 1440]; // 30 min, 1h, 24h
    return durations[Math.min(warningCount, 2)];
  }

  // AI tự động tóm tắt sau 60 phút
  async generateSummary(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room) throw new Error('Room not found');

    const recentMessages = room.messages.filter(msg => {
      const age = Date.now() - msg.timestamp;
      return age < 3600000; // 60 phút
    });

    const messageTexts = recentMessages
      .map(m => `${m.userName}: ${m.content}`)
      .join('\n');

    const summaryPrompt = `
    Tóm tắt nội dung chính đã thảo luận trong phòng học môn "${room.subject}":
    
    ${messageTexts}
    
    Hãy tạo bản tóm tắt gọn gàng, có cấu trúc, giúp học sinh ôn tập lại nội dung chính.
    `;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: summaryPrompt
      }]
    }, {
      headers: { 'Authorization': `Bearer ${this.analyzer.apiKey}` }
    });

    const summaryContent = response.data.choices[0].message.content;

    room.summary = {
      lastSummaryAt: new Date(),
      content: summaryContent,
      pdfUrl: null // TODO: Generate PDF
    };

    await room.save();
    return summaryContent;
  }

  // Gợi ý khi nhóm im lặng > 10 phút
  async checkAndSuggestQuestion(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room || room.messages.length === 0) return null;

    const lastMessage = room.messages[room.messages.length - 1];
    const silenceTime = Date.now() - new Date(lastMessage.timestamp);

    if (silenceTime > 600000) { // 10 phút
      // TODO: Generate câu hỏi liên quan từ AI
      return {
        suggestion: '📚 Mọi người có muốn làm thêm 1 bài tập vận dụng không?',
        type: 'question_suggestion'
      };
    }

    return null;
  }

  // Lấy bảng xếp hạng
  async getLeaderboard(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    return room.members
      .sort((a, b) => b.points - a.points)
      .map((m, idx) => ({
        rank: idx + 1,
        name: m.userName,
        points: m.points,
        warningCount: m.warningCount
      }));
  }
}

module.exports = FocusChatManager;
```

---

### 4. `c:\Users\nh\Downloads\dự án ai\routes\focusChat.js`

Routes cho FocusChat API

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\routes\focusChat.js
const express = require('express');
const router = express.Router();
const FocusChatManager = require('../services/focusChatManager');

const manager = new FocusChatManager(process.env.OPENAI_API_KEY);

// Tạo phòng học
router.post('/rooms', async (req, res) => {
  try {
    const room = await manager.createRoom(req.body);
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Gửi tin nhắn + AI phân tích
router.post('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { userId, userName, content } = req.body;
    const result = await manager.processMessage(req.params.roomId, userId, userName, content);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Lấy tóm tắt
router.post('/rooms/:roomId/summary', async (req, res) => {
  try {
    const summary = await manager.generateSummary(req.params.roomId);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Bảng xếp hạng
router.get('/rooms/:roomId/leaderboard', async (req, res) => {
  try {
    const leaderboard = await manager.getLeaderboard(req.params.roomId);
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Kiểm tra gợi ý câu hỏi
router.get('/rooms/:roomId/check-suggestion', async (req, res) => {
  try {
    const suggestion = await manager.checkAndSuggestQuestion(req.params.roomId);
    res.json({ success: true, data: suggestion });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

---

### 5. `c:\Users\nh\Downloads\dự án ai\public\focusChat.html`

Giao diện FocusChat

```html
<!-- filepath: c:\Users\nh\Downloads\dự án ai\public\focusChat.html -->
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FocusChat - Phòng Học Nhóm</title>
  <style>
    * { margin: 0; padding: 
```


## License: unknown
https://github.com/tvloc38/web-fullstack/blob/e6d5114b97a1c73410eb44c61bcce96b19f65496/nodejs/HTML%20CSS/index.html

```
# 🚀 Nâng cấp StudyMate AI - Tích hợp FocusChat

Tôi sẽ giúp bạn tích hợp module **FocusChat** vào StudyMate AI. Đây là quy trình từng bước:

## 📋 Kế hoạch thực hiện

1. **Tạo model dữ liệu** cho phòng học & tin nhắn
2. **Tích hợp API AI** để phân loại nội dung
3. **Xây dựng logic giám sát** (warning → limit → lock)
4. **Tạo UI cho FocusChat**
5. **Tính năng đặc biệt**: Tóm tắt, gợi ý, hệ thống điểm

---

## 📁 Các file cần tạo/chỉnh sửa

### 1. `c:\Users\nh\Downloads\dự án ai\models\FocusChat.js`

Model cho phòng học với giám sát AI

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\models\FocusChat.js
const mongoose = require('mongoose');

// Schema cho tin nhắn
const messageSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
  contentType: { type: String, enum: ['learning', 'non-learning', 'spam'], default: null },
  aiAnalysis: {
    relevanceScore: Number, // 0-100
    category: String,
    warning: Boolean,
    suggestedEdit: String
  },
  isEdited: Boolean,
  editedContent: String
});

// Schema cho phòng học
const focusChatRoomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true },
  roomName: String,
  subject: { type: String, enum: ['Toán', 'Văn', 'Anh', 'Lý', 'Hóa', 'Sinh'] },
  createdBy: String,
  members: [
    {
      userId: String,
      userName: String,
      joinedAt: { type: Date, default: Date.now },
      warningCount: { type: Number, default: 0 },
      lockUntil: Date,
      points: { type: Number, default: 0 },
      role: { type: String, enum: ['teacher', 'student'], default: 'student' }
    }
  ],
  messages: [messageSchema],
  roomStatus: { type: String, enum: ['active', 'archived'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  summary: {
    lastSummaryAt: Date,
    content: String,
    pdfUrl: String
  },
  lastActivityAt: { type: Date, default: Date.now },
  silenceStartTime: Date // Để track khi nào bắt đầu im lặng
});

// Schema cho lịch sử vi phạm
const violationHistorySchema = new mongoose.Schema({
  userId: String,
  roomId: String,
  violationType: { type: String, enum: ['warning', 'limit', 'lock'], default: 'warning' },
  messageId: String,
  violatedContent: String,
  timestamp: { type: Date, default: Date.now },
  lockDuration: Number // phút
});

module.exports = {
  FocusRoom: mongoose.model('FocusRoom', focusChatRoomSchema),
  Violation: mongoose.model('Violation', violationHistorySchema)
};
```

---

### 2. `c:\Users\nh\Downloads\dự án ai\services\aiContentAnalyzer.js`

Service phân tích nội dung bằng AI

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\services\aiContentAnalyzer.js
const axios = require('axios');

class AIContentAnalyzer {
  constructor(apiKey, provider = 'openai') {
    this.apiKey = apiKey;
    this.provider = provider;
  }

  async analyzeMessage(message, subject) {
    try {
      let response;

      if (this.provider === 'openai') {
        response = await this._analyzeWithOpenAI(message, subject);
      } else if (this.provider === 'google') {
        response = await this._analyzeWithGoogle(message, subject);
      }

      return response;
    } catch (error) {
      console.error('AI Analysis Error:', error);
      return this._defaultAnalysis();
    }
  }

  async _analyzeWithOpenAI(message, subject) {
    const prompt = `
    Phân tích tin nhắn sau trong ngữ cảnh phòng học môn "${subject}".
    
    Tin nhắn: "${message}"
    
    Trả lại JSON với:
    {
      "contentType": "learning" | "non-learning" | "spam",
      "relevanceScore": 0-100,
      "category": "kiến thức" | "bài tập" | "thảo luận" | "không liên quan" | "spam",
      "isApproved": true/false,
      "suggestedEdit": "đề xuất sửa (nếu cần)",
      "reason": "lý do phân loại"
    }`;

    const res = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Bạn là trợ lý giáo dục phân tích nội dung học tập'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return JSON.parse(res.data.choices[0].message.content);
  }

  async _analyzeWithGoogle(message, subject) {
    // Tương tự cho Google API
    // TODO: Implement Google API
    return this._defaultAnalysis();
  }

  _defaultAnalysis() {
    return {
      contentType: 'non-learning',
      relevanceScore: 50,
      category: 'unknown',
      isApproved: true,
      suggestedEdit: null,
      reason: 'Không thể phân tích'
    };
  }
}

module.exports = AIContentAnalyzer;
```

---

### 3. `c:\Users\nh\Downloads\dự án ai\services\focusChatManager.js`

Logic giám sát & kiểm soát

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\services\focusChatManager.js
const { FocusRoom, Violation } = require('../models/FocusChat');
const AIContentAnalyzer = require('./aiContentAnalyzer');

class FocusChatManager {
  constructor(aiApiKey, provider = 'openai') {
    this.analyzer = new AIContentAnalyzer(aiApiKey, provider);
  }

  // Tạo phòng học mới
  async createRoom(roomData) {
    const newRoom = new FocusRoom({
      roomId: `room_${Date.now()}`,
      roomName: roomData.roomName,
      subject: roomData.subject,
      createdBy: roomData.createdBy,
      members: [{
        userId: roomData.createdBy,
        userName: roomData.creatorName,
        role: 'teacher'
      }]
    });

    return await newRoom.save();
  }

  // Xử lý tin nhắn + AI phân tích
  async processMessage(roomId, userId, userName, content) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room) throw new Error('Room not found');

    // Kiểm tra user bị khóa
    const member = room.members.find(m => m.userId === userId);
    if (member?.lockUntil && new Date() < member.lockUntil) {
      return {
        status: 'locked',
        message: '⏳ Bạn bị khóa tạm thời. Vui lòng chờ đến: ' + member.lockUntil,
        lockUntil: member.lockUntil
      };
    }

    // AI phân tích nội dung
    const analysis = await this.analyzer.analyzeMessage(content, room.subject);

    // Quyết định hành động
    const action = this._determineAction(member.warningCount, analysis.contentType);

    const messageDoc = {
      userId,
      userName,
      content,
      contentType: analysis.contentType,
      aiAnalysis: analysis,
      timestamp: new Date()
    };

    // Xử lý theo mức độ vi phạm
    if (analysis.contentType === 'learning') {
      // ✅ Nội dung tốt - Công 5 điểm
      messageDoc.warning = false;
      member.points += 5;
    } else if (analysis.contentType === 'non-learning') {
      messageDoc.warning = true;

      if (action === 'warning_1') {
        // 🟢 Mức 1: Nhắc nhở
        room.messages.push(messageDoc);
        await room.save();

        return {
          status: 'warning',
          level: 1,
          message: '⚠️ Tin nhắn này có vẻ không liên quan đến chủ đề học tập. Bạn có muốn chỉnh sửa không?',
          suggestedEdit: analysis.suggestedEdit,
          warningCount: member.warningCount + 1
        };
      } else if (action === 'limit') {
        // 🟡 Mức 2: Giới hạn
        member.warningCount += 1;
        member.points -= 10;
        room.messages.push(messageDoc);
        await room.save();

        return {
          status: 'limit',
          level: 2,
          message: '⏱️ Giới hạn: 1 tin nhắn/2 phút trong 5 phút tới',
          warningCount: member.warningCount
        };
      } else if (action === 'lock') {
        // 🔴 Mức 3: Khóa
        const lockDuration = this._calculateLockDuration(member.warningCount);
        member.lockUntil = new Date(Date.now() + lockDuration * 60000);
        member.warningCount = 0;
        member.points -= 20;

        await new Violation({
          userId,
          roomId,
          violationType: 'lock',
          messageId: undefined,
          violatedContent: content,
          lockDuration: lockDuration
        }).save();

        await room.save();

        return {
          status: 'locked',
          level: 3,
          lockDuration,
          message: `🔒 Bạn bị khóa ${lockDuration} phút vì vi phạm nhiều lần`,
          lockUntil: member.lockUntil
        };
      }
    }

    // Thêm tin nhắn vào room
    room.messages.push(messageDoc);
    room.lastActivityAt = new Date();

    // Reset silence timer
    room.silenceStartTime = null;

    await room.save();

    return {
      status: 'success',
      messageId: messageDoc._id,
      points: member.points
    };
  }

  // Xác định hành động dựa trên số lần cảnh báo
  _determineAction(warningCount, contentType) {
    if (contentType === 'learning') return 'approve';
    if (warningCount === 0) return 'warning_1';
    if (warningCount === 1) return 'limit';
    return 'lock';
  }

  // Tính thời gian khóa tăng dần
  _calculateLockDuration(warningCount) {
    const durations = [30, 60, 1440]; // 30 min, 1h, 24h
    return durations[Math.min(warningCount, 2)];
  }

  // AI tự động tóm tắt sau 60 phút
  async generateSummary(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room) throw new Error('Room not found');

    const recentMessages = room.messages.filter(msg => {
      const age = Date.now() - msg.timestamp;
      return age < 3600000; // 60 phút
    });

    const messageTexts = recentMessages
      .map(m => `${m.userName}: ${m.content}`)
      .join('\n');

    const summaryPrompt = `
    Tóm tắt nội dung chính đã thảo luận trong phòng học môn "${room.subject}":
    
    ${messageTexts}
    
    Hãy tạo bản tóm tắt gọn gàng, có cấu trúc, giúp học sinh ôn tập lại nội dung chính.
    `;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: summaryPrompt
      }]
    }, {
      headers: { 'Authorization': `Bearer ${this.analyzer.apiKey}` }
    });

    const summaryContent = response.data.choices[0].message.content;

    room.summary = {
      lastSummaryAt: new Date(),
      content: summaryContent,
      pdfUrl: null // TODO: Generate PDF
    };

    await room.save();
    return summaryContent;
  }

  // Gợi ý khi nhóm im lặng > 10 phút
  async checkAndSuggestQuestion(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room || room.messages.length === 0) return null;

    const lastMessage = room.messages[room.messages.length - 1];
    const silenceTime = Date.now() - new Date(lastMessage.timestamp);

    if (silenceTime > 600000) { // 10 phút
      // TODO: Generate câu hỏi liên quan từ AI
      return {
        suggestion: '📚 Mọi người có muốn làm thêm 1 bài tập vận dụng không?',
        type: 'question_suggestion'
      };
    }

    return null;
  }

  // Lấy bảng xếp hạng
  async getLeaderboard(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    return room.members
      .sort((a, b) => b.points - a.points)
      .map((m, idx) => ({
        rank: idx + 1,
        name: m.userName,
        points: m.points,
        warningCount: m.warningCount
      }));
  }
}

module.exports = FocusChatManager;
```

---

### 4. `c:\Users\nh\Downloads\dự án ai\routes\focusChat.js`

Routes cho FocusChat API

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\routes\focusChat.js
const express = require('express');
const router = express.Router();
const FocusChatManager = require('../services/focusChatManager');

const manager = new FocusChatManager(process.env.OPENAI_API_KEY);

// Tạo phòng học
router.post('/rooms', async (req, res) => {
  try {
    const room = await manager.createRoom(req.body);
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Gửi tin nhắn + AI phân tích
router.post('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { userId, userName, content } = req.body;
    const result = await manager.processMessage(req.params.roomId, userId, userName, content);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Lấy tóm tắt
router.post('/rooms/:roomId/summary', async (req, res) => {
  try {
    const summary = await manager.generateSummary(req.params.roomId);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Bảng xếp hạng
router.get('/rooms/:roomId/leaderboard', async (req, res) => {
  try {
    const leaderboard = await manager.getLeaderboard(req.params.roomId);
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Kiểm tra gợi ý câu hỏi
router.get('/rooms/:roomId/check-suggestion', async (req, res) => {
  try {
    const suggestion = await manager.checkAndSuggestQuestion(req.params.roomId);
    res.json({ success: true, data: suggestion });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

---

### 5. `c:\Users\nh\Downloads\dự án ai\public\focusChat.html`

Giao diện FocusChat

```html
<!-- filepath: c:\Users\nh\Downloads\dự án ai\public\focusChat.html -->
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FocusChat - Phòng Học Nhóm</title>
  <style>
    * { margin: 0; padding: 
```


## License: unknown
https://github.com/tvloc38/web-fullstack/blob/e6d5114b97a1c73410eb44c61bcce96b19f65496/nodejs/HTML%20CSS/index.html

```
# 🚀 Nâng cấp StudyMate AI - Tích hợp FocusChat

Tôi sẽ giúp bạn tích hợp module **FocusChat** vào StudyMate AI. Đây là quy trình từng bước:

## 📋 Kế hoạch thực hiện

1. **Tạo model dữ liệu** cho phòng học & tin nhắn
2. **Tích hợp API AI** để phân loại nội dung
3. **Xây dựng logic giám sát** (warning → limit → lock)
4. **Tạo UI cho FocusChat**
5. **Tính năng đặc biệt**: Tóm tắt, gợi ý, hệ thống điểm

---

## 📁 Các file cần tạo/chỉnh sửa

### 1. `c:\Users\nh\Downloads\dự án ai\models\FocusChat.js`

Model cho phòng học với giám sát AI

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\models\FocusChat.js
const mongoose = require('mongoose');

// Schema cho tin nhắn
const messageSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
  contentType: { type: String, enum: ['learning', 'non-learning', 'spam'], default: null },
  aiAnalysis: {
    relevanceScore: Number, // 0-100
    category: String,
    warning: Boolean,
    suggestedEdit: String
  },
  isEdited: Boolean,
  editedContent: String
});

// Schema cho phòng học
const focusChatRoomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true },
  roomName: String,
  subject: { type: String, enum: ['Toán', 'Văn', 'Anh', 'Lý', 'Hóa', 'Sinh'] },
  createdBy: String,
  members: [
    {
      userId: String,
      userName: String,
      joinedAt: { type: Date, default: Date.now },
      warningCount: { type: Number, default: 0 },
      lockUntil: Date,
      points: { type: Number, default: 0 },
      role: { type: String, enum: ['teacher', 'student'], default: 'student' }
    }
  ],
  messages: [messageSchema],
  roomStatus: { type: String, enum: ['active', 'archived'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  summary: {
    lastSummaryAt: Date,
    content: String,
    pdfUrl: String
  },
  lastActivityAt: { type: Date, default: Date.now },
  silenceStartTime: Date // Để track khi nào bắt đầu im lặng
});

// Schema cho lịch sử vi phạm
const violationHistorySchema = new mongoose.Schema({
  userId: String,
  roomId: String,
  violationType: { type: String, enum: ['warning', 'limit', 'lock'], default: 'warning' },
  messageId: String,
  violatedContent: String,
  timestamp: { type: Date, default: Date.now },
  lockDuration: Number // phút
});

module.exports = {
  FocusRoom: mongoose.model('FocusRoom', focusChatRoomSchema),
  Violation: mongoose.model('Violation', violationHistorySchema)
};
```

---

### 2. `c:\Users\nh\Downloads\dự án ai\services\aiContentAnalyzer.js`

Service phân tích nội dung bằng AI

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\services\aiContentAnalyzer.js
const axios = require('axios');

class AIContentAnalyzer {
  constructor(apiKey, provider = 'openai') {
    this.apiKey = apiKey;
    this.provider = provider;
  }

  async analyzeMessage(message, subject) {
    try {
      let response;

      if (this.provider === 'openai') {
        response = await this._analyzeWithOpenAI(message, subject);
      } else if (this.provider === 'google') {
        response = await this._analyzeWithGoogle(message, subject);
      }

      return response;
    } catch (error) {
      console.error('AI Analysis Error:', error);
      return this._defaultAnalysis();
    }
  }

  async _analyzeWithOpenAI(message, subject) {
    const prompt = `
    Phân tích tin nhắn sau trong ngữ cảnh phòng học môn "${subject}".
    
    Tin nhắn: "${message}"
    
    Trả lại JSON với:
    {
      "contentType": "learning" | "non-learning" | "spam",
      "relevanceScore": 0-100,
      "category": "kiến thức" | "bài tập" | "thảo luận" | "không liên quan" | "spam",
      "isApproved": true/false,
      "suggestedEdit": "đề xuất sửa (nếu cần)",
      "reason": "lý do phân loại"
    }`;

    const res = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Bạn là trợ lý giáo dục phân tích nội dung học tập'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return JSON.parse(res.data.choices[0].message.content);
  }

  async _analyzeWithGoogle(message, subject) {
    // Tương tự cho Google API
    // TODO: Implement Google API
    return this._defaultAnalysis();
  }

  _defaultAnalysis() {
    return {
      contentType: 'non-learning',
      relevanceScore: 50,
      category: 'unknown',
      isApproved: true,
      suggestedEdit: null,
      reason: 'Không thể phân tích'
    };
  }
}

module.exports = AIContentAnalyzer;
```

---

### 3. `c:\Users\nh\Downloads\dự án ai\services\focusChatManager.js`

Logic giám sát & kiểm soát

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\services\focusChatManager.js
const { FocusRoom, Violation } = require('../models/FocusChat');
const AIContentAnalyzer = require('./aiContentAnalyzer');

class FocusChatManager {
  constructor(aiApiKey, provider = 'openai') {
    this.analyzer = new AIContentAnalyzer(aiApiKey, provider);
  }

  // Tạo phòng học mới
  async createRoom(roomData) {
    const newRoom = new FocusRoom({
      roomId: `room_${Date.now()}`,
      roomName: roomData.roomName,
      subject: roomData.subject,
      createdBy: roomData.createdBy,
      members: [{
        userId: roomData.createdBy,
        userName: roomData.creatorName,
        role: 'teacher'
      }]
    });

    return await newRoom.save();
  }

  // Xử lý tin nhắn + AI phân tích
  async processMessage(roomId, userId, userName, content) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room) throw new Error('Room not found');

    // Kiểm tra user bị khóa
    const member = room.members.find(m => m.userId === userId);
    if (member?.lockUntil && new Date() < member.lockUntil) {
      return {
        status: 'locked',
        message: '⏳ Bạn bị khóa tạm thời. Vui lòng chờ đến: ' + member.lockUntil,
        lockUntil: member.lockUntil
      };
    }

    // AI phân tích nội dung
    const analysis = await this.analyzer.analyzeMessage(content, room.subject);

    // Quyết định hành động
    const action = this._determineAction(member.warningCount, analysis.contentType);

    const messageDoc = {
      userId,
      userName,
      content,
      contentType: analysis.contentType,
      aiAnalysis: analysis,
      timestamp: new Date()
    };

    // Xử lý theo mức độ vi phạm
    if (analysis.contentType === 'learning') {
      // ✅ Nội dung tốt - Công 5 điểm
      messageDoc.warning = false;
      member.points += 5;
    } else if (analysis.contentType === 'non-learning') {
      messageDoc.warning = true;

      if (action === 'warning_1') {
        // 🟢 Mức 1: Nhắc nhở
        room.messages.push(messageDoc);
        await room.save();

        return {
          status: 'warning',
          level: 1,
          message: '⚠️ Tin nhắn này có vẻ không liên quan đến chủ đề học tập. Bạn có muốn chỉnh sửa không?',
          suggestedEdit: analysis.suggestedEdit,
          warningCount: member.warningCount + 1
        };
      } else if (action === 'limit') {
        // 🟡 Mức 2: Giới hạn
        member.warningCount += 1;
        member.points -= 10;
        room.messages.push(messageDoc);
        await room.save();

        return {
          status: 'limit',
          level: 2,
          message: '⏱️ Giới hạn: 1 tin nhắn/2 phút trong 5 phút tới',
          warningCount: member.warningCount
        };
      } else if (action === 'lock') {
        // 🔴 Mức 3: Khóa
        const lockDuration = this._calculateLockDuration(member.warningCount);
        member.lockUntil = new Date(Date.now() + lockDuration * 60000);
        member.warningCount = 0;
        member.points -= 20;

        await new Violation({
          userId,
          roomId,
          violationType: 'lock',
          messageId: undefined,
          violatedContent: content,
          lockDuration: lockDuration
        }).save();

        await room.save();

        return {
          status: 'locked',
          level: 3,
          lockDuration,
          message: `🔒 Bạn bị khóa ${lockDuration} phút vì vi phạm nhiều lần`,
          lockUntil: member.lockUntil
        };
      }
    }

    // Thêm tin nhắn vào room
    room.messages.push(messageDoc);
    room.lastActivityAt = new Date();

    // Reset silence timer
    room.silenceStartTime = null;

    await room.save();

    return {
      status: 'success',
      messageId: messageDoc._id,
      points: member.points
    };
  }

  // Xác định hành động dựa trên số lần cảnh báo
  _determineAction(warningCount, contentType) {
    if (contentType === 'learning') return 'approve';
    if (warningCount === 0) return 'warning_1';
    if (warningCount === 1) return 'limit';
    return 'lock';
  }

  // Tính thời gian khóa tăng dần
  _calculateLockDuration(warningCount) {
    const durations = [30, 60, 1440]; // 30 min, 1h, 24h
    return durations[Math.min(warningCount, 2)];
  }

  // AI tự động tóm tắt sau 60 phút
  async generateSummary(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room) throw new Error('Room not found');

    const recentMessages = room.messages.filter(msg => {
      const age = Date.now() - msg.timestamp;
      return age < 3600000; // 60 phút
    });

    const messageTexts = recentMessages
      .map(m => `${m.userName}: ${m.content}`)
      .join('\n');

    const summaryPrompt = `
    Tóm tắt nội dung chính đã thảo luận trong phòng học môn "${room.subject}":
    
    ${messageTexts}
    
    Hãy tạo bản tóm tắt gọn gàng, có cấu trúc, giúp học sinh ôn tập lại nội dung chính.
    `;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{
        role: 'user',
        content: summaryPrompt
      }]
    }, {
      headers: { 'Authorization': `Bearer ${this.analyzer.apiKey}` }
    });

    const summaryContent = response.data.choices[0].message.content;

    room.summary = {
      lastSummaryAt: new Date(),
      content: summaryContent,
      pdfUrl: null // TODO: Generate PDF
    };

    await room.save();
    return summaryContent;
  }

  // Gợi ý khi nhóm im lặng > 10 phút
  async checkAndSuggestQuestion(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    if (!room || room.messages.length === 0) return null;

    const lastMessage = room.messages[room.messages.length - 1];
    const silenceTime = Date.now() - new Date(lastMessage.timestamp);

    if (silenceTime > 600000) { // 10 phút
      // TODO: Generate câu hỏi liên quan từ AI
      return {
        suggestion: '📚 Mọi người có muốn làm thêm 1 bài tập vận dụng không?',
        type: 'question_suggestion'
      };
    }

    return null;
  }

  // Lấy bảng xếp hạng
  async getLeaderboard(roomId) {
    const room = await FocusRoom.findOne({ roomId });
    return room.members
      .sort((a, b) => b.points - a.points)
      .map((m, idx) => ({
        rank: idx + 1,
        name: m.userName,
        points: m.points,
        warningCount: m.warningCount
      }));
  }
}

module.exports = FocusChatManager;
```

---

### 4. `c:\Users\nh\Downloads\dự án ai\routes\focusChat.js`

Routes cho FocusChat API

```javascript
// filepath: c:\Users\nh\Downloads\dự án ai\routes\focusChat.js
const express = require('express');
const router = express.Router();
const FocusChatManager = require('../services/focusChatManager');

const manager = new FocusChatManager(process.env.OPENAI_API_KEY);

// Tạo phòng học
router.post('/rooms', async (req, res) => {
  try {
    const room = await manager.createRoom(req.body);
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Gửi tin nhắn + AI phân tích
router.post('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { userId, userName, content } = req.body;
    const result = await manager.processMessage(req.params.roomId, userId, userName, content);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Lấy tóm tắt
router.post('/rooms/:roomId/summary', async (req, res) => {
  try {
    const summary = await manager.generateSummary(req.params.roomId);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Bảng xếp hạng
router.get('/rooms/:roomId/leaderboard', async (req, res) => {
  try {
    const leaderboard = await manager.getLeaderboard(req.params.roomId);
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Kiểm tra gợi ý câu hỏi
router.get('/rooms/:roomId/check-suggestion', async (req, res) => {
  try {
    const suggestion = await manager.checkAndSuggestQuestion(req.params.roomId);
    res.json({ success: true, data: suggestion });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

---

### 5. `c:\Users\nh\Downloads\dự án ai\public\focusChat.html`

Giao diện FocusChat

```html
<!-- filepath: c:\Users\nh\Downloads\dự án ai\public\focusChat.html -->
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FocusChat - Phòng Học Nhóm</title>
  <style>
    * { margin: 0; padding: 
```

