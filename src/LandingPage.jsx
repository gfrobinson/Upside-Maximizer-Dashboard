import React, { useState } from 'react';
import { TrendingUp, ArrowRight, ChevronDown, ArrowUpRight, Shield, RefreshCw, Bell } from 'lucide-react';

export default function LandingPage({ onSignIn }) {
  const [showSampleCalc, setShowSampleCalc] = useState(false);

  // Sample calculation values
  const sampleHighest = 200;
  const sampleVol = 10;
  const sampleMult = 2.0;
  const sampleUMPrice = sampleHighest * (1 - (sampleVol * sampleMult) / 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-emerald-400" size={28} />
          <span className="text-xl font-bold tracking-tight">Upside Maximizer</span>
        </div>
        <button
          onClick={onSignIn}
          className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
        >
          Sign In / Sign Up <ArrowRight size={16} />
        </button>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight tracking-tight">
          Protect Your Biggest<br />
          <span className="text-emerald-400">Winners</span>
        </h1>
        <p className="text-slate-300 text-xl max-w-2xl mx-auto mb-4 leading-relaxed">
          A simple dashboard to implement the <strong className="text-white">Upside Maximizer</strong> strategy —
          a volatility-based trailing stop system designed to let winning stocks run while locking in gains.
        </p>
        <p className="text-slate-300 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          The strategy was developed by <strong className="text-white">Lobo Tiggre</strong>, founder of{' '}
          <a href="https://independentspeculator.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
            Independent Speculator
          </a>. This app makes implementing UMs a breeze.{' '}
          <a
            href="https://independentspeculator.com/reports/upside-maximizer:-a-proven-buy-low-sell-high-strategy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
          >
            Read the full strategy writeup <ArrowUpRight size={14} />
          </a>
        </p>
      </section>

      {/* How It Works */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-bold mb-2 text-center">How It Works</h2>
        <p className="text-slate-400 text-center mb-10">Four simple principles that drive the strategy</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              number: '01',
              title: 'Only for Big Winners',
              color: 'emerald',
              desc: 'The UM strategy applies only to stocks that have already doubled. Once a position is up 100%+, you\'ve recovered your cost basis on half — now the goal is to maximize how much of that gain you keep.'
            },
            {
              number: '02',
              title: 'Volatility-Based Trailing Stop',
              color: 'blue',
              desc: 'The UM Execution Price is set a multiple of the stock\'s typical volatility below its highest close. This gives the stock room to breathe through normal pullbacks without triggering a sale.'
            },
            {
              number: '03',
              title: 'Ratchets Up, Never Down',
              color: 'amber',
              desc: 'Every time the stock sets a new closing high, the UM price ratchets up with it — automatically locking in more of your gain. It never moves down, even if the stock pulls back.'
            },
            {
              number: '04',
              title: 'Actionable Signal',
              color: 'red',
              desc: 'When the stock closes at or below its UM Execution Price, that\'s your signal to act — sell all, sell some, or reassess. The app alerts you immediately so you never miss it.'
            }
          ].map(item => (
            <div key={item.number} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className={`text-4xl font-black mb-3 ${
                item.color === 'emerald' ? 'text-emerald-700' :
                item.color === 'blue' ? 'text-blue-700' :
                item.color === 'amber' ? 'text-amber-700' : 'text-red-800'
              }`}>{item.number}</div>
              <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
              <p className="text-slate-400 leading-relaxed text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Sample Calculator */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowSampleCalc(!showSampleCalc)}
            className="w-full flex items-center justify-between px-6 py-5 hover:bg-slate-700/30 transition-colors"
          >
            <div className="text-left">
              <h3 className="text-lg font-bold text-white">See a Sample Calculation</h3>
              <p className="text-slate-400 text-sm">How the UM Execution Price is calculated</p>
            </div>
            <ChevronDown className={`text-slate-400 transition-transform ${showSampleCalc ? 'rotate-180' : ''}`} size={20} />
          </button>

          {showSampleCalc && (
            <div className="px-6 pb-6 border-t border-slate-700">
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Inputs */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Example Position</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-700">
                      <span className="text-slate-400 text-sm">Entry Price</span>
                      <span className="text-white font-medium">$50.00</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-700">
                      <span className="text-slate-400 text-sm">Current / Highest Close</span>
                      <span className="text-white font-medium">${sampleHighest.toFixed(2)} <span className="text-emerald-400 text-xs">(+300%)</span></span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-700">
                      <span className="text-slate-400 text-sm">Typical Volatility</span>
                      <span className="text-white font-medium">{sampleVol}%</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-700">
                      <span className="text-slate-400 text-sm">Multiplier</span>
                      <span className="text-white font-medium">{sampleMult}×</span>
                    </div>
                  </div>
                </div>

                {/* Result */}
                <div className="bg-slate-900/50 rounded-lg p-5 border border-slate-700 flex flex-col justify-center">
                  <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Calculation</h4>
                  <div className="space-y-2 text-sm text-slate-400 mb-4">
                    <p>Volatility buffer = {sampleVol}% × {sampleMult} = <span className="text-white">{sampleVol * sampleMult}%</span></p>
                    <p>UM Price = ${sampleHighest} × (1 − {sampleVol * sampleMult / 100}) = <span className="text-orange-400 font-bold text-lg">${sampleUMPrice.toFixed(2)}</span></p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 border border-slate-600 text-xs text-slate-400">
                    If the stock closes at or below <span className="text-orange-400 font-semibold">${sampleUMPrice.toFixed(2)}</span>, you receive an alert — a {sampleVol * sampleMult}% pullback from the all-time high. Normal fluctuations above this level are ignored.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <h2 className="text-3xl font-bold mb-10 text-center">What the App Does</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: <RefreshCw size={22} />, title: 'Automatic Price Updates', desc: 'Prices update every weekday after market close via Finnhub — no manual entry needed.' },
            { icon: <Bell size={22} />, title: 'Trigger Alerts', desc: 'Get emailed the moment a stock closes at or below its UM Execution Price.' },
            { icon: <Shield size={22} />, title: 'Track & Archive', desc: 'Log resolved UMs, close positions, and maintain a full history of your winning trades.' },
          ].map(f => (
            <div key={f.title} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="w-10 h-10 bg-emerald-900/40 border border-emerald-700/40 rounded-lg flex items-center justify-center text-emerald-400 mb-4">
                {f.icon}
              </div>
              <h3 className="text-white font-semibold mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-xl p-10 text-center">
          <h2 className="text-3xl font-bold mb-3">Ready to protect your winners?</h2>
          <p className="text-slate-300 mb-7 max-w-lg mx-auto">Sign up free and start tracking your positions in minutes.</p>
          <button
            onClick={onSignIn}
            className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-lg transition-colors"
          >
            Get Started <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-6 max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-slate-500 text-sm">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-600" />
          <span>Upside Maximizer</span>
        </div>
        <p>
          Strategy by{' '}
          <a href="https://independentspeculator.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-emerald-400 underline underline-offset-2">
            Lobo Tiggre / Independent Speculator
          </a>
        </p>
        <p>This app is a tracking tool only. Not financial advice.</p>
      </footer>
    </div>
  );
}
