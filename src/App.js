import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle, Plus, Trash2, Bell, Search, LogOut as LogOutIcon, User, HelpCircle, Settings, Mail } from 'lucide-react';
import { auth, savePortfolio, getPortfolio, subscribeToPortfolio, logOut } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import AuthModal from './AuthModal';

export default function App() {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [stocks, setStocks] = useState([]);
  const [newStock, setNewStock] = useState({
    symbol: '',
    companyName: '',
    entryPrice: '',
    currentPrice: '',
    highestClose: '',
    highestCloseDate: '',
    volatilityMultiplier: 2.0,
    typicalVolatility: ''
  });
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [showVolatilityHelp, setShowVolatilityHelp] = useState(false);
  const [stockCache, setStockCache] = useState({});
  const [emailPreferences, setEmailPreferences] = useState({
    summaryFrequency: 'none', // 'none', 'daily', 'friday', 'triggerOnly'
    emailAddress: ''
  });
  const [showSettings, setShowSettings] = useState(false);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) {
        setShowAuthModal(true);
      }
    });
    return unsubscribe;
  }, []);

  // Subscribe to portfolio updates when user is logged in
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToPortfolio(user.uid, (portfolioData) => {
      setStocks(portfolioData.stocks || []);
      setAlerts(portfolioData.alerts || []);
      setLastUpdate(portfolioData.lastUpdate);
      setEmailPreferences(portfolioData.emailPreferences || {
        summaryFrequency: 'none',
        emailAddress: user.email || ''
      });
    });

    return unsubscribe;
  }, [user]);

  const calculateStopLoss = (highestClose, typicalVol, multiplier) => {
    const volatilityDecline = typicalVol * multiplier;
    return highestClose * (1 - volatilityDecline / 100);
  };

  const fetchStockInfo = async () => {
    if (!newStock.symbol) {
      alert('Please enter a stock symbol');
      return;
    }

    const symbolUpper = newStock.symbol.toUpperCase();
    
    // Check cache first
    if (stockCache[symbolUpper]) {
      const cached = stockCache[symbolUpper];
      setNewStock(prev => ({
        ...prev,
        currentPrice: cached.price.toFixed(2),
        companyName: cached.companyName,
        highestClose: cached.highestClose.toFixed(2),
        highestCloseDate: cached.highestCloseDate
      }));
      return;
    }

    setIsFetching(true);

    try {
      // Fetch daily data to get current price and historical highs
      const response = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbolUpper}&outputsize=compact&apikey=YIL96BCWV46JKXBR`
      );
      
      const data = await response.json();

      if (data['Note']) {
        alert('API call limit reached. Please wait a minute and try again.');
        setIsFetching(false);
        return;
      }

      if (data['Error Message']) {
        alert('Invalid stock symbol. Please check and try again.');
        setIsFetching(false);
        return;
      }

      if (!data['Time Series (Daily)']) {
        alert('Unable to fetch data. Please check the symbol and try again.');
        setIsFetching(false);
        return;
      }

      const timeSeries = data['Time Series (Daily)'];
      const dates = Object.keys(timeSeries);
      const latestPrice = parseFloat(timeSeries[dates[0]]['4. close']);
      
      // Find highest close in the last 100 days
      let highestClose = 0;
      let highestCloseDate = dates[0];
      
      for (const date of dates) {
        const closePrice = parseFloat(timeSeries[date]['4. close']);
        if (closePrice > highestClose) {
          highestClose = closePrice;
          highestCloseDate = date;
        }
      }

      // Fetch company overview for the name
      let companyName = symbolUpper;
      try {
        const overviewResponse = await fetch(
          `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbolUpper}&apikey=YIL96BCWV46JKXBR`
        );
        const overviewData = await overviewResponse.json();
        if (overviewData['Name']) {
          companyName = overviewData['Name'];
        }
      } catch (e) {
        console.log('Could not fetch company name, using symbol');
      }

      // Save to cache
      setStockCache(prev => ({
        ...prev,
        [symbolUpper]: { 
          price: latestPrice, 
          companyName: companyName,
          highestClose: highestClose,
          highestCloseDate: highestCloseDate
        }
      }));

      // Auto-fill the current price, company name, and highest close
      setNewStock(prev => ({
        ...prev,
        currentPrice: latestPrice.toFixed(2),
        companyName: companyName,
        highestClose: highestClose.toFixed(2),
        highestCloseDate: highestCloseDate
      }));

    } catch (error) {
      console.error('Error fetching stock info:', error);
      alert('Error fetching stock info. Please try again.');
    }

    setIsFetching(false);
  };

  const addStock = async () => {
    if (!user) {
      alert('Please sign in to add stocks');
      return;
    }

    if (!newStock.symbol || !newStock.entryPrice || !newStock.currentPrice || !newStock.typicalVolatility) {
      alert('Please fill in all required fields');
      return;
    }

    const entry = parseFloat(newStock.entryPrice);
    const current = parseFloat(newStock.currentPrice);
    const highest = parseFloat(newStock.highestClose) || current;
    
    if (current < entry * 2) {
      alert('Stock must be up at least 100% (doubled) to set an Upside Maximizer');
      return;
    }

    const stock = {
      id: Date.now(),
      symbol: newStock.symbol.toUpperCase(),
      companyName: newStock.companyName || newStock.symbol.toUpperCase(),
      entryPrice: entry,
      currentPrice: current,
      highestClose: highest,
      highestCloseDate: newStock.highestCloseDate || new Date().toISOString().split('T')[0],
      volatilityMultiplier: parseFloat(newStock.volatilityMultiplier),
      typicalVolatility: parseFloat(newStock.typicalVolatility),
      dateAdded: new Date().toISOString().split('T')[0],
      triggered: false
    };

    const updatedStocks = [...stocks, stock];
    setStocks(updatedStocks);
    
    await savePortfolio(user.uid, {
      stocks: updatedStocks,
      alerts
    });
    
    setNewStock({
      symbol: '',
      companyName: '',
      entryPrice: '',
      currentPrice: '',
      highestClose: '',
      highestCloseDate: '',
      volatilityMultiplier: 2.0,
      typicalVolatility: ''
    });
  };

  const updateStockPrice = async (id, newPrice) => {
    if (!user) return;
    
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) return;

    const updatedStocks = stocks.map(stock => {
      if (stock.id !== id) return stock;

      const isNewHigh = price > stock.highestClose;
      const newHighest = Math.max(stock.highestClose, price);
      const newHighestDate = isNewHigh ? new Date().toISOString().split('T')[0] : stock.highestCloseDate;
      const stopLoss = calculateStopLoss(newHighest, stock.typicalVolatility, stock.volatilityMultiplier);

      if (price <= stopLoss && !stock.triggered) {
        const alert = {
          id: Date.now(),
          symbol: stock.symbol,
          message: `${stock.symbol} triggered at $${price.toFixed(2)} (UM Price: $${stopLoss.toFixed(2)})`,
          time: new Date().toISOString()
        };
        const updatedAlerts = [alert, ...alerts];
        setAlerts(updatedAlerts);
        
        return { ...stock, currentPrice: price, highestClose: newHighest, highestCloseDate: newHighestDate, triggered: true };
      }

      return { ...stock, currentPrice: price, highestClose: newHighest, highestCloseDate: newHighestDate };
    });

    setStocks(updatedStocks);
    
    await savePortfolio(user.uid, {
      stocks: updatedStocks,
      alerts
    });
  };

  const deleteStock = async (id) => {
    if (!user) return;
    
    const updatedStocks = stocks.filter(stock => stock.id !== id);
    setStocks(updatedStocks);
    
    await savePortfolio(user.uid, {
      stocks: updatedStocks,
      alerts
    });
  };

  const handleLogOut = async () => {
    try {
      await logOut();
      setStocks([]);
      setAlerts([]);
      setLastUpdate(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const saveEmailPreferences = async (newPrefs) => {
    if (!user) return;
    
    setEmailPreferences(newPrefs);
    await savePortfolio(user.uid, {
      stocks,
      alerts,
      emailPreferences: newPrefs
    });
  };

  const gainPercent = (stock) => {
    return ((stock.currentPrice - stock.entryPrice) / stock.entryPrice * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {showAuthModal && <AuthModal onClose={() => {}} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="text-emerald-400" size={24} />
              <h2 className="text-xl font-bold text-white">Email Notifications</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                <input
                  type="email"
                  value={emailPreferences.emailAddress}
                  onChange={(e) => setEmailPreferences({...emailPreferences, emailAddress: e.target.value})}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Email Frequency</label>
                
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="summaryFrequency"
                      value="none"
                      checked={emailPreferences.summaryFrequency === 'none'}
                      onChange={(e) => setEmailPreferences({...emailPreferences, summaryFrequency: e.target.value})}
                      className="mt-1 w-4 h-4 bg-slate-700 border-slate-600 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div className="text-slate-300">
                      <span className="font-medium">No Emails</span>
                      <p className="text-sm text-slate-400">I'll check the website manually</p>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="summaryFrequency"
                      value="daily"
                      checked={emailPreferences.summaryFrequency === 'daily'}
                      onChange={(e) => setEmailPreferences({...emailPreferences, summaryFrequency: e.target.value})}
                      className="mt-1 w-4 h-4 bg-slate-700 border-slate-600 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div className="text-slate-300">
                      <span className="font-medium">Daily Summary</span>
                      <p className="text-sm text-slate-400">Receive a summary every day after market close, plus trigger alerts</p>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="summaryFrequency"
                      value="friday"
                      checked={emailPreferences.summaryFrequency === 'friday'}
                      onChange={(e) => setEmailPreferences({...emailPreferences, summaryFrequency: e.target.value})}
                      className="mt-1 w-4 h-4 bg-slate-700 border-slate-600 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div className="text-slate-300">
                      <span className="font-medium">Friday Summary</span>
                      <p className="text-sm text-slate-400">Receive a weekly summary on Fridays, plus trigger alerts</p>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="summaryFrequency"
                      value="triggerOnly"
                      checked={emailPreferences.summaryFrequency === 'triggerOnly'}
                      onChange={(e) => setEmailPreferences({...emailPreferences, summaryFrequency: e.target.value})}
                      className="mt-1 w-4 h-4 bg-slate-700 border-slate-600 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div className="text-slate-300">
                      <span className="font-medium">Trigger Alerts Only</span>
                      <p className="text-sm text-slate-400">Only email me when a stock hits its UM Execution Price</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  saveEmailPreferences(emailPreferences);
                  setShowSettings(false);
                }}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur rounded-lg shadow-2xl p-6 mb-6 border border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="text-emerald-400" size={32} />
              <div>
                <h1 className="text-3xl font-bold text-white">Upside Maximizer</h1>
                {lastUpdate && (
                  <p className="text-sm text-slate-400">
                    Last updated: {new Date(lastUpdate).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-2 text-white">
                  <User size={20} />
                  <span className="font-medium">{user.email || user.displayName}</span>
                </div>
                <p className="text-xs text-slate-400">
                  {stocks.length} {stocks.length === 1 ? 'stock' : 'stocks'} tracked
                </p>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                <Settings size={20} />
              </button>
              <button
                onClick={handleLogOut}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                <LogOutIcon size={20} />
                Sign Out
              </button>
            </div>
          </div>
          
          <p className="text-slate-300 mb-6">
            Track stocks that have doubled and set trailing UM execution prices based on typical volatility. 
            The UM execution price ratchets up with each new high but never down. Prices update automatically each weekday after market close.
          </p>

          {/* Add New Stock Form */}
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 mb-4">
            <h3 className="text-lg font-semibold text-white mb-4">Add New Stock</h3>
            
            {/* Symbol and Lookup */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-300 mb-2">Stock Symbol</label>
                <input
                  type="text"
                  value={newStock.symbol}
                  onChange={(e) => setNewStock({...newStock, symbol: e.target.value.toUpperCase(), companyName: ''})}
                  placeholder="e.g., AAPL, NVDA"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchStockInfo}
                  disabled={isFetching || !newStock.symbol}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Search size={18} />
                  {isFetching ? 'Looking up...' : 'Look Up'}
                </button>
              </div>
            </div>

            {/* Company Name Display */}
            {newStock.companyName && (
              <div className="mb-4 p-3 bg-slate-800 rounded-lg border border-slate-600">
                <p className="text-lg font-semibold text-white">{newStock.companyName}</p>
                <p className="text-sm text-slate-400">{newStock.symbol} · Last Close: ${newStock.currentPrice}</p>
                {newStock.highestClose && (
                  <p className="text-sm text-emerald-400">
                    Highest Close: ${newStock.highestClose} ({newStock.highestCloseDate})
                  </p>
                )}
              </div>
            )}

            {/* Price Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Your Entry Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={newStock.entryPrice}
                  onChange={(e) => setNewStock({...newStock, entryPrice: e.target.value})}
                  placeholder="What you paid per share"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Last Close</label>
                <input
                  type="number"
                  step="0.01"
                  value={newStock.currentPrice}
                  onChange={(e) => setNewStock({...newStock, currentPrice: e.target.value})}
                  placeholder="Auto-filled from lookup"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Volatility Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm font-medium text-slate-300">Typical Volatility (%)</label>
                  <button
                    onClick={() => setShowVolatilityHelp(!showVolatilityHelp)}
                    className="text-slate-400 hover:text-slate-300"
                  >
                    <HelpCircle size={16} />
                  </button>
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={newStock.typicalVolatility}
                  onChange={(e) => setNewStock({...newStock, typicalVolatility: e.target.value})}
                  placeholder="e.g., 8"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  value={newStock.volatilityMultiplier}
                  onChange={(e) => setNewStock({...newStock, volatilityMultiplier: e.target.value})}
                  placeholder="e.g., 2.0"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Volatility Help Text */}
            {showVolatilityHelp && (
              <div className="mb-4 p-4 bg-blue-900/30 rounded-lg border border-blue-700 text-sm text-slate-300">
                <p className="font-semibold text-white mb-2">How to determine Typical Volatility:</p>
                <p className="mb-2">
                  Look at a chart of the stock during a period when it was <strong>trending up overall</strong>. 
                  Measure several pullbacks from local highs to local lows (the temporary dips before it continued higher).
                </p>
                <p className="mb-2">
                  Ignore extreme outliers and note the <strong>typical pullback size</strong>. For example, if most pullbacks 
                  are between 8-12%, enter 10 as your typical volatility.
                </p>
                <p>
                  The <strong>multiplier</strong> gives the stock breathing room. A multiplier of 2.0 means your UM execution price will be 
                  set at 2× the typical volatility below the highest close.
                </p>
              </div>
            )}

            {/* UM Execution Price Preview */}
            {newStock.highestClose && newStock.typicalVolatility && (
              <div className="mb-4 p-3 bg-slate-800 rounded-lg border border-slate-600">
                <p className="text-sm text-slate-400">UM Execution Price Preview (based on highest close):</p>
                <p className="text-xl font-bold text-orange-400">
                  ${calculateStopLoss(
                    parseFloat(newStock.highestClose), 
                    parseFloat(newStock.typicalVolatility), 
                    parseFloat(newStock.volatilityMultiplier)
                  ).toFixed(2)}
                </p>
                <p className="text-xs text-slate-500">
                  {newStock.typicalVolatility}% × {newStock.volatilityMultiplier} = {(parseFloat(newStock.typicalVolatility) * parseFloat(newStock.volatilityMultiplier)).toFixed(1)}% below highest close (${newStock.highestClose})
                </p>
              </div>
            )}

            <button
              onClick={addStock}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 font-semibold"
            >
              <Plus size={20} />
              Add Stock to Tracker
            </button>
          </div>
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="bg-red-900/30 backdrop-blur rounded-lg shadow-xl p-6 mb-6 border border-red-700">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="text-red-400" size={24} />
              <h2 className="text-xl font-bold text-white">Alerts</h2>
            </div>
            <div className="space-y-2">
              {alerts.map(alert => (
                <div key={alert.id} className="bg-red-800/30 p-3 rounded-lg border border-red-700">
                  <p className="text-white font-semibold">{alert.message}</p>
                  <p className="text-red-300 text-sm">{new Date(alert.time).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Stocks */}
        <div className="space-y-4">
          {stocks.map(stock => {
            const stopLoss = calculateStopLoss(stock.highestClose, stock.typicalVolatility, stock.volatilityMultiplier);
            const distanceToStop = ((stock.currentPrice - stopLoss) / stock.currentPrice * 100).toFixed(1);
            
            return (
              <div
                key={stock.id}
                className={`backdrop-blur rounded-lg shadow-xl p-6 border ${
                  stock.triggered 
                    ? 'bg-red-900/30 border-red-700' 
                    : 'bg-slate-800/50 border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{stock.symbol}</h3>
                    {stock.companyName && stock.companyName !== stock.symbol && (
                      <p className="text-slate-400 text-sm">{stock.companyName}</p>
                    )}
                    <p className="text-slate-500 text-xs">Added {stock.dateAdded}</p>
                  </div>
                  <button
                    onClick={() => deleteStock(stock.id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-slate-400 text-sm">Entry Price</p>
                    <p className="text-white font-semibold">${stock.entryPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Last Close</p>
                    <p className="text-white font-semibold">${stock.currentPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Total Gain</p>
                    <p className="text-emerald-400 font-semibold">+{gainPercent(stock)}%</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Highest Close</p>
                    <p className="text-white font-semibold">${stock.highestClose.toFixed(2)}</p>
                    <p className="text-slate-500 text-xs">{stock.highestCloseDate || stock.dateAdded}</p>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-300">UM Execution Price:</span>
                    <span className="text-xl font-bold text-orange-400">${stopLoss.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-300">Distance to UM Price:</span>
                    <span className={`font-semibold ${parseFloat(distanceToStop) < 5 ? 'text-red-400' : 'text-slate-300'}`}>
                      {distanceToStop}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">
                      Vol: {stock.typicalVolatility}% × {stock.volatilityMultiplier} = {(stock.typicalVolatility * stock.volatilityMultiplier).toFixed(1)}% below high
                    </span>
                    {stock.triggered && (
                      <span className="text-red-400 font-semibold flex items-center gap-1">
                        <AlertCircle size={16} />
                        TRIGGERED
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {stocks.length === 0 && (
          <div className="bg-slate-800/50 backdrop-blur rounded-lg shadow-xl p-12 text-center border border-slate-700">
            <TrendingUp className="mx-auto text-slate-600 mb-4" size={48} />
            <p className="text-slate-400 text-lg">No stocks being tracked yet</p>
            <p className="text-slate-500 text-sm mt-2">Add a stock that's up 100%+ to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
