/**
 * Upside Maximizer - Daily Price Update Script
 * Uses Finnhub API for price data
 */

const admin = require('firebase-admin');
const https = require('https');

// Initialize Firebase Admin using full service account JSON
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@upsidemaximizer.com';

// Rate limiting helper
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Calculate UM Execution Price
function calculateUMPrice(highestClose, typicalVol, multiplier) {
  const volatilityDecline = typicalVol * multiplier;
  return highestClose * (1 - volatilityDecline / 100);
}

// Send email via SendGrid
async function sendEmail(to, subject, htmlContent) {
  if (!SENDGRID_API_KEY) {
    console.log('  SendGrid not configured, skipping email');
    return;
  }

  const data = JSON.stringify({
    personalizations: [{ to: [{ email: to }] }],
    from: { email: EMAIL_FROM, name: 'Upside Maximizer' },
    subject: subject,
    content: [{ type: 'text/html', value: htmlContent }]
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.sendgrid.com',
      port: 443,
      path: '/v3/mail/send',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`  ✓ Email sent to ${to}`);
        resolve();
      } else {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          console.error(`  ✗ Email failed: ${res.statusCode} ${body}`);
          reject(new Error(`Email failed: ${res.statusCode}`));
        });
      }
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Generate daily summary email HTML
function generateDailySummaryEmail(stocks) {
  const rows = stocks.map(stock => {
    const umPrice = calculateUMPrice(stock.highestClose, stock.typicalVolatility, stock.volatilityMultiplier);
    const distancePercent = ((stock.currentPrice - umPrice) / stock.currentPrice * 100).toFixed(1);
    const distanceDollars = (stock.currentPrice - umPrice).toFixed(2);
    const isClose = parseFloat(distancePercent) < 10;
    
    return `
      <tr style="background: ${isClose ? '#fef2f2' : '#ffffff'}">
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${stock.symbol}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${stock.companyName || stock.symbol}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">$${stock.currentPrice.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">$${stock.highestClose.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #ea580c; font-weight: bold;">$${umPrice.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: ${isClose ? '#dc2626' : '#059669'}">
          ${distancePercent}% ($${distanceDollars})
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <h1 style="color: #10b981;">📈 Upside Maximizer Daily Summary</h1>
      <p style="color: #6b7280;">Here's your portfolio status for ${new Date().toLocaleDateString()}:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Symbol</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Company</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Last Close</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Highest Close</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">UM Price</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Distance</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      
      <p style="color: #9ca3af; font-size: 12px;">
        Positions highlighted in red are within 10% of their UM Execution Price.
      </p>
    </div>
  `;
}

// Generate trigger alert email HTML
function generateTriggerAlertEmail(stock, umPrice) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #dc2626;">🚨 UM Execution Price Triggered!</h1>
      
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h2 style="margin: 0 0 10px 0; color: #1f2937;">${stock.symbol}</h2>
        <p style="margin: 0; color: #6b7280;">${stock.companyName || ''}</p>
        
        <table style="margin-top: 15px;">
          <tr>
            <td style="padding: 5px 20px 5px 0; color: #6b7280;">Last Close:</td>
            <td style="font-weight: bold;">$${stock.currentPrice.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 20px 5px 0; color: #6b7280;">UM Execution Price:</td>
            <td style="font-weight: bold; color: #ea580c;">$${umPrice.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 20px 5px 0; color: #6b7280;">Highest Close:</td>
            <td>$${stock.highestClose.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 5px 20px 5px 0; color: #6b7280;">Entry Price:</td>
            <td>$${stock.entryPrice.toFixed(2)}</td>
          </tr>
        </table>
      </div>
      
      <p style="color: #6b7280;">
        Consider reviewing this position. The stock has closed at or below your UM Execution Price.
      </p>
    </div>
  `;
}

// Fetch price from Finnhub
async function fetchPriceFinnhub(symbol) {
  return new Promise((resolve) => {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.c && json.c > 0) {
            resolve(json.c);
          } else {
            resolve(null);
          }
        } catch (error) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

// Fetch price from Alpha Vantage
async function fetchPriceAlphaVantage(symbol) {
  return new Promise((resolve) => {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${ALPHA_VANTAGE_KEY}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json['Global Quote'] && json['Global Quote']['05. price']) {
            resolve(parseFloat(json['Global Quote']['05. price']));
          } else {
            resolve(null);
          }
        } catch (error) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

// Fetch price - try Finnhub first, then Alpha Vantage
async function fetchPrice(symbol) {
  // Try Finnhub first
  let price = await fetchPriceFinnhub(symbol);
  
  if (price) {
    console.log(`  ${symbol}: $${price.toFixed(2)} (Finnhub)`);
    return price;
  }
  
  // Fall back to Alpha Vantage
  if (ALPHA_VANTAGE_KEY) {
    price = await fetchPriceAlphaVantage(symbol);
    
    if (price) {
      console.log(`  ${symbol}: $${price.toFixed(2)} (Alpha Vantage)`);
      return price;
    }
  }
  
  console.log(`  ${symbol}: No data found`);
  return null;
}

// Main update function
async function updateAllPrices() {
  console.log('='.repeat(50));
  console.log('Upside Maximizer - Daily Price Update');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('='.repeat(50));
  
  if (!FINNHUB_KEY) {
    console.error('ERROR: FINNHUB_API_KEY not set');
    process.exit(1);
  }
  
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.error('ERROR: FIREBASE_SERVICE_ACCOUNT not set');
    process.exit(1);
  }

  try {
    // Get all portfolio documents
    const portfoliosRef = db.collection('portfolios');
    const snapshot = await portfoliosRef.get();
    
    if (snapshot.empty) {
      console.log('No portfolios found.');
      return;
    }
    
    console.log(`Found ${snapshot.size} portfolio(s) to update.\n`);
    
    // Collect all unique symbols across all users
    const allSymbols = new Set();
    const userPortfolios = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const stocks = data.stocks || [];
      userPortfolios.push({ 
        userId: doc.id, 
        stocks, 
        data,
        emailPreferences: data.emailPreferences || {}
      });
      stocks.forEach(stock => {
        if (stock.symbol) {
          allSymbols.add(stock.symbol.toUpperCase());
        }
      });
    });
    
    console.log(`Unique symbols to fetch: ${Array.from(allSymbols).join(', ')}\n`);
    
    // Fetch prices for all unique symbols
    const priceMap = new Map();
    const symbolArray = Array.from(allSymbols);
    
    for (let i = 0; i < symbolArray.length; i++) {
      const symbol = symbolArray[i];
      
      try {
        const price = await fetchPrice(symbol);
        if (price !== null) {
          priceMap.set(symbol, price);
        }
      } catch (error) {
        console.error(`  Error fetching ${symbol}:`, error.message);
      }
      
      // Small delay to be nice to the API (Finnhub allows 60/min, so 1 second is plenty)
      if (i < symbolArray.length - 1) {
        await delay(1000);
      }
    }
    
    console.log(`\nFetched prices for ${priceMap.size} symbols.\n`);
    
    // Update each user's portfolio
    for (const { userId, stocks, data, emailPreferences } of userPortfolios) {
      console.log(`Updating portfolio for user: ${userId.substring(0, 8)}...`);
      
      let updated = false;
      const today = new Date().toISOString().split('T')[0];
      const triggeredStocks = [];
      
      const updatedStocks = stocks.map(stock => {
        const symbol = stock.symbol?.toUpperCase();
        const newPrice = priceMap.get(symbol);
        
        if (newPrice !== undefined) {
          const oldPrice = stock.currentPrice;
          const oldHighest = stock.highestClose;
          
          // Update current price
          stock.currentPrice = newPrice;
          
          // Update highest close if new price is higher
          if (newPrice > (stock.highestClose || 0)) {
            stock.highestClose = newPrice;
            stock.highestCloseDate = today;
            console.log(`  ${symbol}: New high! $${oldHighest?.toFixed(2) || 'N/A'} → $${newPrice.toFixed(2)} (${today})`);
          } else {
            console.log(`  ${symbol}: $${oldPrice?.toFixed(2) || 'N/A'} → $${newPrice.toFixed(2)}`);
          }
          
          // Check if UM price triggered
          const umPrice = calculateUMPrice(stock.highestClose, stock.typicalVolatility, stock.volatilityMultiplier);
          if (newPrice <= umPrice && !stock.triggered) {
            stock.triggered = true;
            triggeredStocks.push({ stock: { ...stock }, umPrice });
            console.log(`  🚨 ${symbol} TRIGGERED at $${newPrice.toFixed(2)} (UM: $${umPrice.toFixed(2)})`);
          }
          
          updated = true;
        }
        
        return stock;
      });
      
      if (updated) {
        // Save back to Firestore
        await portfoliosRef.doc(userId).update({
          stocks: updatedStocks,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`  ✓ Saved to Firestore`);
      } else {
        console.log(`  No updates needed`);
      }
      
      // Send emails if preferences are set
      const userEmail = emailPreferences.emailAddress;
      const frequency = emailPreferences.summaryFrequency || 'none';
      const dayOfWeek = new Date().getDay(); // 0 = Sunday, 5 = Friday
      const isFriday = dayOfWeek === 5;
      
      if (userEmail && SENDGRID_API_KEY && frequency !== 'none') {
        // Send trigger alerts for all options except 'none'
        if (triggeredStocks.length > 0) {
          for (const { stock, umPrice } of triggeredStocks) {
            try {
              await sendEmail(
                userEmail,
                `🚨 ${stock.symbol} Hit UM Execution Price`,
                generateTriggerAlertEmail(stock, umPrice)
              );
            } catch (e) {
              console.error(`  Failed to send trigger email: ${e.message}`);
            }
          }
        }
        
        // Send summary based on frequency preference
        const shouldSendSummary = 
          (frequency === 'daily') || 
          (frequency === 'friday' && isFriday);
        
        if (shouldSendSummary && updatedStocks.length > 0) {
          try {
            const summaryType = frequency === 'friday' ? 'Weekly' : 'Daily';
            await sendEmail(
              userEmail,
              `📈 Upside Maximizer ${summaryType} Summary - ${today}`,
              generateDailySummaryEmail(updatedStocks)
            );
          } catch (e) {
            console.error(`  Failed to send summary email: ${e.message}`);
          }
        }
      }
      
      console.log('');
    }
    
    console.log('='.repeat(50));
    console.log('Update complete!');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the update
updateAllPrices();
