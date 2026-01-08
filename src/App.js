import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle, Plus, Trash2, Bell, Activity, LogOut as LogOutIcon, User } from 'lucide-react';
import { auth, savePortfolio, getPortfolio, subscribeToPortfolio, logOut } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import AuthModal from './AuthModal';

export default function App() {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [stocks, setStocks] = useState([]);
  const [newStock, setNewStock] = useState({
    symbol: '',
    entryPrice: '',
    currentPrice: '',
    volatilityMultiplier: 2.0,
    typicalVolatility: 10
  });
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [volAnalysis, setVolAnalysis] = useState(null);

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
    });

    return unsubscribe;
  }, [user]);

  const calculateStopLoss = (highestClose, typicalVol, multiplier) => {
    const volatilityDecline = typicalVol * multiplier;
    return highestClose * (1 - volatilityDecline / 100);
  };

  const analyzeVolatility = async () => {
    if (!newStock.symbol) {
      alert('Please enter a stock symbol');
      return;
    }

    setIsAnalyzing(true);
    setVolAnalysis(null);

    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${newStock.symbol}&outputsize=compact&apikey=${process.env.REACT_APP_ALPHA_VANTAGE_API_KEY || 'demo'}`
      );
      
      const data = await response.json();

      if (data['Note']) {
        alert('API call limit reached. Please wait a minute and try again.');
        setIsAnalyzing(false);
        return;
      }

      if (data['Error Message']) {
        alert('Invalid stock symbol. Please check and try again.');
        setIsAnalyzing(false);
        return;
      }

      if (!data['Time Series (Daily)']) {
        alert('Unable to fetch historical data. Please check the symbol and try again.');
        setIsAnalyzing(false);
        return;
      }

      const timeSeries = data['Time Series (Daily)'];
      const dates = Object.keys(timeSeries).slice(0, 60);
      const prices = dates.map(date => parseFloat(timeSeries[date]['4. close']));

      // Find all pullbacks from local highs
      const pullbacks = [];
      let currentHigh = prices[0];
      
      for (let i = 1; i < prices.length; i++) {
        if (prices[i] > currentHigh) {
          currentHigh = prices[i];
        } else if (prices[i] < currentHigh) {
          const decline = ((currentHigh - prices[i]) / currentHigh) * 100;
          if (decline > 2) { // Only count pullbacks > 2%
            pullbacks.push({
              date: dates[i],
              decline: decline,
              from: currentHigh,
              to: prices[i]
            });
          }
        }
      }

      if (pullbacks.length === 0) {
        alert('Not enough pullback data found in recent history');
        setIsAnalyzing(false);
        return;
      }

      // Calculate typical volatility (middle 50% of pullbacks)
      pullbacks.sort((a, b) => a.decline - b.decline);
      const q1 = Math.floor(pullbacks.length * 0.25);
      const q3 = Math.floor(pullbacks.length * 0.75);
      const middlePullbacks = pullbacks.slice(q1, q3);
      
      const typicalVol = middlePullbacks.reduce((sum, p) => sum + p.decline, 0) / middlePullbacks.length;
      const avgVol = pullbacks.reduce((sum, p) => sum + p.decline, 0) / pullbacks.length;

      setVolAnalysis({
        recommended: typicalVol,
        average: avgVol,
        pullbacks: pullbacks.slice(0, 10),
        dataPoints: pullbacks.length
      });

      setNewStock(prev => ({
        ...prev,
        typicalVolatility: Math.round(typicalVol * 10) / 10
      }));

    } catch (error) {
      console.error('Error analyzing volatility:', error);
      alert('Error analyzing volatility. Please try again.');
    }

    setIsAnalyzing(false);
  };

  const addStock = async () => {
    if (!user) {
      alert('Please sign in to add stocks');
      return;
    }

    if (!newStock.symbol || !newStock.entryPrice || !newStock.currentPrice) {
      alert('Please fill in all required fields');
      return;
    }

    const entry = parseFloat(newStock.entryPrice);
    const current = parseFloat(newStock.currentPrice);
    
    if (current < entry * 2) {
      alert('Stock must be up at least 100% (doubled) to set an Upside Maximizer');
      return;
    }

    const stock = {
      id: Date.now(),
      symbol: newStock.symbol.toUpperCase(),
      entryPrice: entry,
      currentPrice: current,
      highestClose: current,
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
      entryPrice: '',
      currentPrice: '',
      volatilityMultiplier: 2.0,
      typicalVolatility: 10
    });
    setVolAnalysis(null);
  };

  const updateStockPrice = async (id, newPrice) => {
    if (!user) return;
    
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) return;

    const updatedStocks = stocks.map(stock => {
      if (stock.id !== id) return stock;

      const newHighest = Math.max(stock.highestClose, price);
      const stopLoss = calculateStopLoss(newHighest, stock.typicalVolatility, stock.volatilityMultiplier);

      if (price <= stopLoss && !stock.triggered) {
        const alert = {
          id: Date.now(),
          symbol: stock.symbol,
          message: `${stock.symbol} triggered at $${price.toFixed(2)} (Stop: $${stopLoss.toFixed(2)})`,
          time: new Date().toISOString()
        };
        const updatedAlerts = [alert, ...alerts];
        setAlerts(updatedAlerts);
        
        return { ...stock, currentPrice: price, highestClose: newHighest, triggered: true };
      }

      return { ...stock, currentPrice: price, highestClose: newHighest };
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
                onClick={handleLogOut}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                <LogOutIcon size={20} />
                Sign Out
              </button>
            </div>
          </div>
          
          <p className="text-slate-300 mb-6">
            Track stocks that have doubled and set trailing stops based on typical volatility. 
            Your portfolio is automatically saved to the cloud and syncs across all devices.
          </p>

          {/* Add New Stock Form */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Stock Symbol</label>
              <input
                type="text"
                value={newStock.symbol}
                onChange={(e) => setNewStock({...newStock, symbol: e.target.value.toUpperCase()})}
                placeholder="e.g., AAPL, PMETF"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Entry Price</label>
              <input
                type="number"
                step="0.01"
                value={newStock.entryPrice}
                onChange={(e) => setNewStock({...newStock, entryPrice: e.target.value})}
                placeholder="Original buy price"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Current Price</label>
              <input
                type="number"
                step="0.01"
                value={newStock.currentPrice}
                onChange={(e) => setNewStock({...newStock, currentPrice: e.target.value})}
                placeholder="Latest close price"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Volatility Analysis */}
          <div className="mb-4 bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="text-emerald-400" size={20} />
              <h3 className="text-lg font-semibold text-white">Volatility Analysis</h3>
            </div>
            
            <button
              onClick={analyzeVolatility}
              disabled={isAnalyzing || !newStock.symbol}
              className="mb-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
            >
              {isAnalyzing ? 'Analyzing...' : `Analyze ${newStock.symbol || 'Stock'} Volatility`}
            </button>

            {volAnalysis && (
              <div className="bg-slate-800/50 p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Recommended Typical Volatility</p>
                    <p className="text-2xl font-bold text-emerald-400">{volAnalysis.recommended.toFixed(1)}%</p>
                    <p className="text-xs text-slate-500">Middle 50% of pullbacks</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Average of All Pullbacks</p>
                    <p className="text-2xl font-bold text-slate-300">{volAnalysis.average.toFixed(1)}%</p>
                    <p className="text-xs text-slate-500">Based on {volAnalysis.dataPoints} pullbacks</p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm font-medium text-slate-300 mb-2">Recent Pullbacks:</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {volAnalysis.pullbacks.map((p, i) => (
                      <div key={i} className="text-xs text-slate-400 flex justify-between">
                        <span>{p.date}</span>
                        <span className="text-red-400">-{p.decline.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Typical Volatility (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newStock.typicalVolatility}
                  onChange={(e) => setNewStock({...newStock, typicalVolatility: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Multiplier
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newStock.volatilityMultiplier}
                  onChange={(e) => setNewStock({...newStock, volatilityMultiplier: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-2">
              Stop loss will be set at: Highest Close × (1 - (Typical Vol × Multiplier) / 100)
            </p>
          </div>

          <button
            onClick={addStock}
            className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 font-semibold"
          >
            <Plus size={20} />
            Add Stock to Tracker
          </button>
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
                    <p className="text-slate-400 text-sm">Added {stock.dateAdded}</p>
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
                    <p className="text-slate-400 text-sm">Current Price</p>
                    <p className="text-white font-semibold">${stock.currentPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Highest Close</p>
                    <p className="text-white font-semibold">${stock.highestClose.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Total Gain</p>
                    <p className="text-emerald-400 font-semibold">+{gainPercent(stock)}%</p>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-300">Stop Loss Price:</span>
                    <span className="text-xl font-bold text-orange-400">${stopLoss.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-300">Distance to Stop:</span>
                    <span className={`font-semibold ${parseFloat(distanceToStop) < 5 ? 'text-red-400' : 'text-slate-300'}`}>
                      {distanceToStop}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">
                      Vol: {stock.typicalVolatility}% × {stock.volatilityMultiplier}
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
