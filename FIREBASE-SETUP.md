# Firebase + Authentication Setup Guide

Complete guide to set up the Upside Maximizer with user authentication and cloud database.

## Part 1: Create Firebase Project

### Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click **Add project**
3. Project name: `upside-maximizer` (or your choice)
4. Disable Google Analytics (optional, not needed)
5. Click **Create project**

### Step 2: Enable Authentication

1. In your Firebase project, click **Authentication** in the left sidebar
2. Click **Get started**
3. Enable **Email/Password**:
   - Click on **Email/Password**
   - Toggle **Enable**
   - Click **Save**
4. Enable **Google Sign-In**:
   - Click on **Google**
   - Toggle **Enable**
   - Select a support email
   - Click **Save**

### Step 3: Create Firestore Database

1. Click **Firestore Database** in the left sidebar
2. Click **Create database**
3. Start in **production mode** (we'll set rules next)
4. Choose a location (choose closest to you)
5. Click **Enable**

### Step 4: Set Firestore Security Rules

1. In Firestore Database, click **Rules** tab
2. Replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own portfolio
    match /portfolios/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click **Publish**

### Step 5: Get Firebase Config

1. Click the **gear icon** ⚙️ next to **Project Overview**
2. Click **Project settings**
3. Scroll down to **Your apps**
4. Click the **</>** (Web) icon
5. App nickname: `Upside Maximizer Web`
6. Check **Also set up Firebase Hosting** (optional)
7. Click **Register app**
8. Copy the `firebaseConfig` object - you'll need these values

Should look like:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "upside-maximizer.firebaseapp.com",
  projectId: "upside-maximizer",
  storageBucket: "upside-maximizer.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### Step 6: Get Firebase Admin Credentials (for GitHub Actions)

1. Still in **Project settings**, click **Service accounts** tab
2. Click **Generate new private key**
3. Click **Generate key** (downloads a JSON file)
4. **KEEP THIS FILE SAFE** - it has admin access to your Firebase project

## Part 2: Configure Your App

### Step 7: Create Environment Variables File

Create a file `.env.local` in your project root:

```env
# Firebase Web Config (from Step 5)
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

**Important**: Add `.env.local` to your `.gitignore` (already done) - never commit this file!

### Step 8: Update .gitignore

Make sure `.gitignore` includes:
```
.env.local
.env
```

## Part 3: GitHub Setup

### Step 9: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `upside-maximizer`
3. Make it **Public** (required for free GitHub Pages)
4. Don't initialize with README
5. Click **Create repository**

### Step 10: Configure GitHub Secrets

Go to your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:

**Firebase Admin (from the JSON file in Step 6):**
- Name: `FIREBASE_PROJECT_ID`
- Value: The `project_id` from your JSON file

- Name: `FIREBASE_CLIENT_EMAIL`  
- Value: The `client_email` from your JSON file

- Name: `FIREBASE_PRIVATE_KEY`
- Value: The `private_key` from your JSON file (including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` parts)

**Stock Price API:**
- Name: `ALPHA_VANTAGE_API_KEY`
- Value: Get free key from https://www.alphavantage.co/support/#api-key

**Email Notifications (Optional):**
- Name: `SENDGRID_API_KEY`
- Value: Get from https://sendgrid.com after signing up

- Name: `SENDGRID_FROM_EMAIL`
- Value: Your verified sender email in SendGrid

### Step 11: Push Code to GitHub

```bash
# In your project directory
git init
git add .
git commit -m "Initial commit with Firebase auth"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/upside-maximizer.git
git push -u origin main
```

### Step 12: Deploy to GitHub Pages

```bash
# Install dependencies
npm install

# Update package.json homepage
# Replace YOUR_USERNAME with your GitHub username in package.json line 5

# Deploy
npm run deploy
```

### Step 13: Enable GitHub Pages

1. Go to repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **gh-pages** / **/ (root)**
4. Save

Visit: `https://YOUR_USERNAME.github.io/upside-maximizer`

## Part 4: Testing

### Test Authentication

1. Visit your deployed site
2. Try **Continue with Google** - should work
3. Try **Email/Password** signup - should work
4. You should see your email in the top right

### Test Portfolio

1. Add a stock (must be up 100%+)
2. Refresh the page - data should persist
3. Open in another browser/device - should see same data

### Test GitHub Actions

1. Go to your repo → **Actions**
2. Click **Update Stock Prices** workflow
3. Click **Run workflow** dropdown
4. Click **Run workflow** button
5. Wait ~1 minute
6. Check the logs to ensure it completed
7. Refresh your app - prices should be updated

## Troubleshooting

### "Firebase: Error (auth/unauthorized-domain)"
**Solution**: 
1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Add `YOUR_USERNAME.github.io`

### "Missing or insufficient permissions"
**Solution**: Check Firestore security rules are set correctly (Step 4)

### GitHub Actions failing
**Solution**: 
1. Verify all secrets are set correctly in GitHub
2. Check that FIREBASE_PRIVATE_KEY includes the full key with BEGIN/END lines
3. Review Actions logs for specific errors

### Email alerts not sending
**Solution**:
1. Verify SendGrid API key and from email in secrets
2. Verify sender email in SendGrid dashboard
3. Check SendGrid delivery logs

## What You Get

✅ **Google Sign-In** - One-click login with Google account  
✅ **Email/Password** - Traditional authentication option  
✅ **Private Portfolios** - Each user has their own isolated data  
✅ **Cloud Storage** - Data syncs across all devices  
✅ **Real-time Updates** - Changes sync instantly  
✅ **Automated Price Updates** - Daily at 4:30 PM EST  
✅ **Email Alerts** - When stops trigger  
✅ **Secure** - Industry-standard Firebase security  

## Important Security Notes

1. **Never commit** your Firebase service account JSON file
2. **Never commit** `.env.local` file
3. **Keep GitHub secrets secure** - only admins should have access
4. **Firestore rules** ensure users can only see their own data
5. Your app is deployed on HTTPS automatically via GitHub Pages

## Next Steps

- Customize email templates in `.github/scripts/update-prices.js`
- Add more authentication providers (Facebook, Twitter, etc.)
- Customize the UI colors and branding
- Add export to CSV feature
- Add performance tracking charts

---

You're all set! Users can now sign in with Google or email/password, and their portfolios are automatically saved to the cloud with daily price updates.
