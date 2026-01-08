# Upside Maximizer - Cloud Edition

A powerful stock portfolio tracker for managing winning positions with automated trailing stops. Built with React, Firebase authentication, and GitHub Actions for automated daily price updates.

## Features

✅ **User Authentication** - Sign in with Google or email/password  
✅ **Private Portfolios** - Each user has their own secure, isolated portfolio  
✅ **Cloud Database** - Your data syncs across all devices in real-time  
✅ **Automated Daily Updates** - GitHub Actions fetches closing prices every weekday at 4:30 PM EST  
✅ **Smart Trailing Stops** - Volatility-based stops that only trigger on closing prices  
✅ **Email Alerts** - Get notified immediately when stops are triggered  
✅ **Multi-Device Access** - Hosted on GitHub Pages, accessible anywhere  
✅ **No Manual Entry** - Set it once, prices update automatical ly  

## Quick Start 

### Prerequisites
- Node.js 18+ installed
- GitHub account
- Firebase account (free tier is fine)
- Alpha Vantage API key (free)

### Setup Instructions

**See [FIREBASE-SETUP.md](./FIREBASE-SETUP.md) for complete step-by-step instructions.**

Quick version:
1. Create Firebase project with Authentication + Firestore
2. Clone this repo
3. Create `.env.local` with your Firebase config
4. Deploy to GitHub Pages
5. Configure GitHub secrets for automated updates

## Architecture

### Frontend (React)
- User authentication via Firebase Auth
- Real-time database sync via Firestore
- Responsive UI with Tailwind CSS
- Hosted on GitHub Pages

### Backend (Firebase)
- **Authentication**: Google OAuth + Email/Password
- **Database**: Firestore with user-scoped security rules
- **Real-time sync**: Changes propagate instantly across devices

### Automation (GitHub Actions)
- Runs daily at market close (4:30 PM EST)
- Updates all users' portfolios
- Sends email alerts for triggered stops
- Uses Firebase Admin SDK for server-side access

## How to Use

### First Time Setup

1. Visit your deployed app
2. Sign in with Google or create an email/password account
3. Your empty portfolio loads automatically

### Adding Stocks

1. Enter stock symbol (e.g., NVDA, AAPL)
2. Enter your entry price (what you paid)
3. Enter current price (will auto-update daily)
4. Set typical volatility % (how much it normally pulls back)
5. Set multiplier (2.0 = 2x breathing room before triggering)
6. Click "Add Stock to Tracker"

**Important**: Stocks must be up at least 100% from entry to add them.

### Stop Loss Calculation

**Formula**: `Stop Loss = Highest Close × (1 - (Typical Vol × Multiplier) / 100)`

**Example**:
- Stock highest close: $150
- Typical volatility: 8%
- Multiplier: 2.0
- Stop loss = $150 × (1 - (8 × 2) / 100) = $150 × 0.84 = **$126**

### Automated Updates

Every weekday at 4:30 PM EST:
1. GitHub Actions fetches latest closing prices
2. Updates highest close if stock made new high
3. Checks if any stops were triggered
4. Sends email alerts for triggered stops
5. Updates all users' Firestore data

## File Structure

```
upside-maximizer/
├── src/
│   ├── App.js                # Main app component
│   ├── AuthModal.js          # Login/signup modal
│   ├── firebase.js           # Firebase config & functions
│   ├── index.js              # Entry point
│   └── index.css             # Styles
├── public/
│   └── index.html            # HTML template
├── .github/
│   ├── workflows/
│   │   ├── update-prices.yml # Scheduled price updates
│   │   └── deploy.yml        # GitHub Pages deployment
│   └── scripts/
│       └── update-prices.js  # Price update logic (Firebase Admin)
├── .env.example              # Example environment variables
├── package.json
├── README.md
└── FIREBASE-SETUP.md         # Detailed setup guide
```

## Customization

### Change Update Schedule

Edit `.github/workflows/update-prices.yml`:

```yaml
schedule:
  # Current: 4:30 PM EST (9:30 PM UTC)
  - cron: '30 21 * * 1-5'
  
  # Examples:
  # 9:30 AM EST: '30 14 * * 1-5'
  # 12:00 PM EST: '0 17 * * 1-5'
```

### Adjust Email Notifications

Edit `.github/scripts/update-prices.js` to customize email content or add other notification methods (Slack, Discord, SMS, etc.)

## Troubleshooting

**GitHub Actions not running:**
- Check that workflows are enabled (Settings → Actions → Allow all actions)
- Verify secrets are set correctly
- Check Actions tab for error logs

**Prices not updating:**
- Verify Alpha Vantage API key is valid
- Check you haven't exceeded rate limits (500 calls/day on free tier)
- Review Actions logs for specific errors

**Email alerts not working:**
- Verify SendGrid API key and sender email
- Check SendGrid dashboard for delivery logs
- Ensure EMAIL_TO secret is set correctly

## Rate Limits

**Alpha Vantage Free Tier:**
- 5 API calls per minute
- 500 API calls per day
- The script automatically waits 12 seconds between stocks to stay under limits

**SendGrid Free Tier:**
- 100 emails per day
- More than enough for stop loss alerts

## Advanced: Local Development

```bash
# Install dependencies
npm install

# Run locally
npm start

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## Contributing

Feel free to submit issues or pull requests for improvements!

## License

MIT

---

**Pro Tip**: Only add stocks that have at least doubled from your entry price. This tracker is designed for managing winners, not setting stops on break-even or losing positions.
