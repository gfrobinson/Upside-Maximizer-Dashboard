/**
 * Upside Maximizer - Daily Price Update Script
 */

const admin = require('firebase-admin');
const https = require('https');

// Initialize Firebase Admin using full service account JSON
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// Rate limiting: Alpha Vantage free tier = 5 requests/minute
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch current price from Alpha Vantage
async function fetchPrice(symbol) {
  return new Promise((resolve, reject) => {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          // Check for API limit message
          if (json.Note || json.Information) {
            console.log(`API limit reached: ${json.Note || json.Information}`);
            reject(new Error('API_LIMIT'));
            return;
          }
          
          if (json['Global Quote'] && json['Global Quote']['05. price']) {
            const price = parseFloat(json['Global Quote']['05. price']);
            console.log(`  ${symbol}: $${price.toFixed(2)}`);
            resolve(price);
          } else {
            console.log(`  ${symbol}: No data found`);
            resolve(null);
          }
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

// Main update function
async function updateAllPrices() {
  console.log('='.repeat(50));
  console.log('Upside Maximizer - Daily Price Update');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('='.repeat(50));
  
  if (!API_KEY) {
    console.error('ERROR: ALPHA_VANTAGE_API_KEY not set');
    process.exit(1);
  }
  
  if (!process.env.FIREBASE_PROJECT_ID) {
    console.error('ERROR: Firebase credentials not set');
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
      userPortfolios.push({ userId: doc.id, stocks, data });
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
        if (error.message === 'API_LIMIT') {
          console.log('Waiting 60 seconds for API limit reset...');
          await delay(60000);
          i--; // Retry this symbol
          continue;
        }
        console.error(`  Error fetching ${symbol}:`, error.message);
      }
      
      // Rate limit: wait 12 seconds between requests (5/minute limit)
      if (i < symbolArray.length - 1) {
        await delay(12000);
      }
    }
    
    console.log(`\nFetched prices for ${priceMap.size} symbols.\n`);
    
    // Update each user's portfolio
    for (const { userId, stocks, data } of userPortfolios) {
      console.log(`Updating portfolio for user: ${userId.substring(0, 8)}...`);
      
      let updated = false;
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
            console.log(`  ${symbol}: New high! $${oldHighest?.toFixed(2) || 'N/A'} → $${newPrice.toFixed(2)}`);
          } else {
            console.log(`  ${symbol}: $${oldPrice?.toFixed(2) || 'N/A'} → $${newPrice.toFixed(2)}`);
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
        console.log(`  ✓ Saved to Firestore\n`);
      } else {
        console.log(`  No updates needed\n`);
      }
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
