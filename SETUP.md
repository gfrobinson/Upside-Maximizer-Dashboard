# Quick Setup Guide

Follow these steps to get your Upside Maximizer running on GitHub:

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `upside-maximizer`
3. Make it Public (required for free GitHub Pages)
4. Don't initialize with README (we already have one)
5. Click "Create repository"

## Step 2: Upload Files

### Option A: Using Git (Recommended)

```bash
# Navigate to the upside-maximizer-github folder
cd upside-maximizer-github

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Add your GitHub repo as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/upside-maximizer.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Option B: Upload via GitHub Web Interface

1. Open your new repository on GitHub
2. Click "uploading an existing file"
3. Drag all files from the `upside-maximizer-github` folder
4. Commit changes

## Step 3: Get API Keys

### Alpha Vantage (Required)
1. Visit: https://www.alphavantage.co/support/#api-key
2. Enter your email
3. Copy your API key (example: `ABC123XYZ456`)

### SendGrid (Optional - for email alerts)
1. Sign up: https://sendgrid.com/free
2. Go to Settings → API Keys → Create API Key
3. Name it "Upside Maximizer"
4. Select "Restricted Access" → Mail Send → Full Access
5. Create & View
6. Copy your API key (starts with `SG.`)
7. Verify your sender email in SendGrid settings

## Step 4: Add GitHub Secrets

1. Go to your repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these secrets one by one:

**Required:**
- Name: `ALPHA_VANTAGE_API_KEY`
- Value: Your Alpha Vantage key

**Optional (for email alerts):**
- Name: `EMAIL_TO`
- Value: Your email address

- Name: `SENDGRID_API_KEY`
- Value: Your SendGrid API key (starts with SG.)

## Step 5: Update package.json

1. Open `package.json` in your repo
2. Find line 5: `"homepage": "https://YOUR_USERNAME.github.io/upside-maximizer"`
3. Replace `YOUR_USERNAME` with your actual GitHub username
4. Commit the change

## Step 6: Deploy to GitHub Pages

### First Time Setup

On your computer, in the project folder:

```bash
# Install dependencies
npm install

# Install gh-pages for deployment
npm install --save-dev gh-pages

# Build and deploy
npm run deploy
```

This creates a `gh-pages` branch with your built app.

### Enable GitHub Pages

1. Go to repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **gh-pages** / **/ (root)**
4. Save

Wait 2-3 minutes, then visit: `https://YOUR_USERNAME.github.io/upside-maximizer`

## Step 7: Enable GitHub Actions

1. Go to **Actions** tab
2. Click "I understand my workflows, go ahead and enable them"
3. You should see "Update Stock Prices" workflow

## Step 8: Test Everything

### Test Manual Workflow Run
1. Go to Actions → Update Stock Prices
2. Click "Run workflow" → "Run workflow"
3. Wait ~30 seconds
4. Check if it completed successfully

### Add Your First Stock
1. Visit your GitHub Pages URL
2. Enter a stock symbol, entry price, current price
3. Set volatility settings
4. Add stock
5. Download the portfolio.json file
6. Upload it to your repo's `data/` folder

### Verify Auto-Updates
The workflow will automatically run every weekday at 4:30 PM EST.

Check the Actions tab to see the runs and logs.

---

## Common Issues

**"npm: command not found"**
- Install Node.js from https://nodejs.org

**Deploy fails**
- Make sure you updated YOUR_USERNAME in package.json
- Check that you ran `npm install` first

**Actions not running**
- Verify you enabled workflows in the Actions tab
- Check that secrets are added correctly (Settings → Secrets)

**Prices not updating**
- Verify Alpha Vantage API key in secrets
- Check Actions logs for error messages
- Free tier limit: 500 calls/day

**Emails not sending**
- Verify SendGrid API key and EMAIL_TO in secrets
- Verify sender email in SendGrid
- Check SendGrid dashboard for delivery logs

---

## You're Done! 🎉

Your Upside Maximizer is now:
- ✅ Hosted on GitHub Pages
- ✅ Auto-updating daily at market close
- ✅ Sending email alerts when stops trigger
- ✅ Accessible from any device

Visit your tracker at: `https://YOUR_USERNAME.github.io/upside-maximizer`
