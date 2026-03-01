# 🚀 StudyMate AI - Quick Start Guide

## ⚡ 5-Minute Setup

### 1️⃣ Get Firebase Credentials (2 min)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project → Name it "StudyMate-AI"
3. Go to **Settings** (⚙️) → **Project Settings**
4. Copy your Web config (looks like example below)

### 2️⃣ Update firebase-config.js (1 min)
```javascript
// Find these lines in firebase-config.js (around line 1-10):
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_ID",
  appId: "YOUR_APP_ID"
};

// Replace with your actual Firebase config
```

### 3️⃣ Enable Authentication (1 min)
In Firebase Console → **Authentication** → **Sign-in method**
- ✅ Enable: Email/Password
- ✅ Enable: Google
- ✅ Enable: Facebook (optional)

### 4️⃣ Create Firestore Database (1 min)
- Go to **Firestore Database**
- Click **Create Database**
- Start in **Production** mode
- Select your region
- Click **Enable**

### 5️⃣ Add Security Rules (1 min)
In Firestore → **Rules** tab, paste:
```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      allow create: if request.auth.uid != null;
    }
  }
}
```
Click **Publish**

---

## 📱 Testing the App

### Test 1: Email Signup
1. Open `login.html`
2. Click "Đăng ký ngay" → Fill 3-step form
3. Check email for verification link
4. Verify email
5. Login with email/password
6. Should see dashboard with stats ✅

### Test 2: Study Tracking
1. On dashboard, ask AI a question
2. Check: XP increased by 5
3. Complete a Pomodoro
4. Check: XP increased by 10
5. Total XP and level should update ✅

### Test 3: Dark Mode
1. Click moon icon (top-right) 🌙
2. Page should switch to dark theme ✅
3. Refresh page
4. Dark theme should persist ✅

### Test 4: Weekly Chart
1. On dashboard, check "Weekly Chart" card
2. Should show 7-day bar graph
3. Click on bars (ready for hover info) ✅

---

## 🔗 File Quick Reference

| Page | URL | Purpose |
|------|-----|---------|
| Login/Signup | `login.html` | Authentication entry point |
| Dashboard | `index.html` | Main app & analytics |
| Email Verify | `verify-email.html` | Auth email confirmation |
| Forgot Password | `forgot-password.html` | Reset request form |
| Reset Password | `reset-password.html` | New password entry |
| 2FA | `two-factor.html` | SMS/App code verification |

---

## 🎯 Key Features at a Glance

### 🔐 Authentication
- Email/Password login
- Google OAuth
- Facebook OAuth  
- 2FA (SMS + Authenticator)
- Email verification
- Password reset

### 📊 Analytics
- Real-time study stats
- Weekly performance chart
- Subject analysis
- XP & Level system
- Daily streak tracking

### 🎮 Gamification
- 10 Level progression
- +5 XP per AI question
- +10 XP per Pomodoro
- Achievement badges
- Motivational badges

### 🎨 UI/UX
- Dark/Light theme
- Modern glassmorphism design
- Smooth animations
- Responsive mobile design
- Accessible components

---

## 🔧 Troubleshooting

### "Firebase is not defined"
**Fix:** Check that Firebase SDK scripts are loaded before `firebase-config.js`

### Email not sending
**Fix:** In Firebase Console → Authentication → Email Templates
- Enable "Custom SMTP" if using production

### OAuth not working
**Fix:** 
1. Add your site to Firebase Authorized domains
2. Add OAuth redirect URIs to Google/Facebook app settings
3. Use HTTPS (required by OAuth)

### Firestore queries failing
**Fix:** Check Firestore security rules allow your user to read/write

### Data not persisting
**Fix:**
1. Check user is authenticated
2. Verify Firestore rules (should show in console errors)
3. Check browser DevTools → Network tab for failed requests

---

## 🌐 Deployment Options

### Option 1: Firebase Hosting (Recommended)
```bash
npm install -g firebase-tools
firebase init hosting
firebase deploy
```

### Option 2: Vercel
1. Push code to GitHub
2. Import in Vercel
3. Connect to GitHub repo
4. Deploy automatically

### Option 3: Traditional Server
1. Upload files via FTP
2. Ensure HTTPS enabled
3. Configure domain in Firebase Console
4. Test all OAuth flows

---

## 📊 Data Flow

```
User Login
    ↓
Firebase Auth ← Firestore
    ↓
Check Email Verified
    ↓
Load Dashboard ← Get User Profile from Firestore
    ↓
Show Analytics ← Calculate from Study Sessions
    ↓
Track Activity ← Save to localStorage + Firestore
    ↓
Update XP/Level ← Auto-calculate on milestones
```

---

## 🎓 Sample User Journey

```
1. First Visit
   → See login page
   → Click "Đăng ký ngay"
   → Enter name, email, password
   → Select avatar, grade, subject
   → Set daily goal, exam date
   → Verify email
   → Get 100 XP welcome bonus
   → See dashboard

2. Study Session
   → Ask AI question (+5 XP)
   → Complete Pomodoro (+10 XP)
   → Total hours tracked automatically
   → Streak increases if daily active
   → Check weekly chart progress
   → Level up when hitting thresholds

3. Password Reset
   → Click "Quên mật khẩu?"
   → Enter email
   → Click reset link in email
   → Enter new password
   → Login with new password
```

---

## 📈 Success Metrics

After setup, you should see:
- ✅ Login page loads with theme toggle
- ✅ Signup 3-step modal works
- ✅ Email verification email arrives
- ✅ Dashboard shows real stats
- ✅ XP increases when tracking events
- ✅ Weekly chart displays correctly
- ✅ Dark mode toggle works
- ✅ Data persists after refresh

---

## 💡 Pro Tips

1. **Test in Incognito** to avoid storage conflicts
2. **Check DevTools** → Console for errors
3. **Use DevTools** → Network tab to monitor API calls
4. **Test on Mobile** before deployment
5. **Setup Email Alerts** in Firebase Console
6. **Monitor Usage** in Firebase Console for quota issues

---

## 📚 Additional Resources

- **Full Setup Guide:** See `FIREBASE_SETUP.md`
- **Implementation Details:** See `IMPLEMENTATION_COMPLETE.md`
- **Firebase Docs:** https://firebase.google.com/docs
- **Security Rules:** https://firebase.google.com/docs/firestore/security/start

---

## 🚀 Ready to Launch?

1. ✅ Update firebase-config.js
2. ✅ Enable authentication methods
3. ✅ Create Firestore database
4. ✅ Add security rules
5. ✅ Test flows above
6. ✅ Deploy to hosting
7. ✅ Celebrate! 🎉

---

**Questions?** Check console logs for detailed error messages.  
**Stuck?** Review the troubleshooting section above.  
**Need more?** Read `FIREBASE_SETUP.md` for complete guide.

**Happy studying! 📚✨**
