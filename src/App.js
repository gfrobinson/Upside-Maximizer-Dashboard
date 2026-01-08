import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle, Plus, Trash2, Bell, Activity, RefreshCw, Save, LogOut as LogOutIcon, User } from 'lucide-react';
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
  const [saving, setSaving] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

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

  const handleSavePortfolio = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      await savePortfolio(user.uid, {
        stocks,
        alerts,
        lastUpdate: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving portfolio:', error);
      alert('Failed to save portfolio');
    }
    setSaving(false);
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

  const calculateStopLoss = (highestClose, typicalVol, multiplier) => {
    const volatilityDecline = typicalVol * multiplier;
    return highestClose * (1 - volatilityDecline / 100);
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
    
    // Auto-save to Firebase
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
    
    // Auto-save to Firebase
    await savePortfolio(user.uid, {
      stocks: updatedStocks,
      alerts
    });
  };

  const deleteStock = async (id) => {
    if (!user) return;
    
    const updatedStocks = stocks.filter(stock => stock.id !== id);
    setStocks(updatedStocks);
    
    // Auto-save to Firebase
    await savePortfolio(user.uid, {
      stocks: updatedStocks,
      alerts
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Stock Symbol</label>
              <input
                type="text"
                value={newStock.symbol}
                onChange={(e) => setNewStock({...newStock, symbol: e.target.value.toUpperCase()})}
                placeholder="e.g., AAPL"
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

          <div className="grid grid-cols-2 gap-4 mb-4">
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

          <p className="text-xs text-slate-400 mb-4">
            Stop loss = Highest Close × (1 - (Typical Vol × Multiplier) / 100)
          </p>

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
