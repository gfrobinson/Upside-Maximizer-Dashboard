# Quick Start Guide

## 🚀 Get Up and Running in 15 Minutes

### Step 1: Firebase (5 minutes)
1. Go to https://console.firebase.google.com
2. Create a new project
3. Enable **Authentication** → Google + Email/Password
4. Enable **Firestore Database** (production mode)
5. Set security rules (copy from FIREBASE-SETUP.md)
6. Get your config from Project Settings

### Step 2: Environment Setup (2 minutes)
1. Copy `.env.example` to `.env.local`
2. Fill in your Firebase config values
3. Save and close

### Step 3: Deploy (5 minutes)
```bash
npm install
npm run deploy
```

### Step 4: GitHub Secrets (3 minutes)
Go to GitHub repo → Settings → Secrets → Actions

Add:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `ALPHA_VANTAGE_API_KEY`
- `SENDGRID_API_KEY` (optional)
- `SENDGRID_FROM_EMAIL` (optional)

### Step 5: Test!
Visit your deployed app and sign in!

---

## 🎯 Common Issues

**"Unauthorized domain"**
→ Add your GitHub Pages URL to Firebase → Authentication → Settings → Authorized domains

**"Missing or insufficient permissions"**
→ Check Firestore security rules

**Actions failing**
→ Verify all GitHub secrets are set correctly

---

## 📚 Full Documentation

- **Complete Setup**: See [FIREBASE-SETUP.md](./FIREBASE-SETUP.md)
- **Features & Usage**: See [README.md](./README.md)
- **Troubleshooting**: Check FIREBASE-SETUP.md troubleshooting section

---

## 🔑 What You Need

- [ ] GitHub account
- [ ] Firebase account (free)
- [ ] Alpha Vantage API key (free from https://www.alphavantage.co)
- [ ] SendGrid account (free, optional for email alerts)
- [ ] 15 minutes

That's it! You'll have a fully functional, cloud-based stock tracker with authentication.
