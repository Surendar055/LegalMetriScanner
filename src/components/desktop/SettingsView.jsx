import React, { useState } from 'react';
import { Settings, Save, Server, Sliders, Shield, Smartphone, Check } from 'lucide-react';
import socketService from '../../services/socketService';

export const SettingsView = () => {
  const [socketUrl, setSocketUrl] = useState('http://localhost:4000');
  const [saved, setSaved] = useState(false);
  const [minFontThreshold, setMinFontThreshold] = useState('2.0');
  const [mpeMargin, setMpeMargin] = useState('4.5');
  const [dualPriceStrict, setDualPriceStrict] = useState(true);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    socketService.init(socketUrl);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">System & Metrology Settings</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure Legal Metrology verification algorithms, regulatory thresholds, and Socket.IO server bridge
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Backend / Socket.IO Connection Config */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <Server className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Socket.IO Backend Integration</h3>
              <p className="text-xs text-slate-400">
                Connect LegalMetriScan to your Node.js / Python Fast-API inspection websocket server
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Websocket Server Endpoint URL
              </label>
              <input
                type="text"
                value={socketUrl}
                onChange={(e) => setSocketUrl(e.target.value)}
                placeholder="http://localhost:4000 or wss://api.metriscan.gov.in"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500/60"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Currently running in standalone simulation mode. When backend is ready, set the URL and connect.
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-200 block">Socket State Handshake</span>
                <span className="text-[11px] text-slate-400">Auto-reconnect with exponential backoff</span>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Active Client
              </span>
            </div>
          </div>
        </div>

        {/* Regulatory Thresholds */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
            <Sliders className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-sm font-bold text-white">LMPC Rules 2011 Audit Calibration</h3>
              <p className="text-xs text-slate-400">
                Legal Metrology (Packaged Commodities) Rule parameter tolerances
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Minimum Numerals Font Height (mm)
              </label>
              <input
                type="number"
                step="0.1"
                value={minFontThreshold}
                onChange={(e) => setMinFontThreshold(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-sky-500/60"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Rule 6(1)(c) mandates &gt;= 2.0mm for net qty &lt; 200g/ml
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Maximum Permissible Error (MPE %)
              </label>
              <input
                type="number"
                step="0.1"
                value={mpeMargin}
                onChange={(e) => setMpeMargin(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 font-mono focus:outline-none focus:border-sky-500/60"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Permissible quantity discrepancy allowed under First Schedule
              </span>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dualPriceStrict}
                onChange={(e) => setDualPriceStrict(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 bg-slate-950 border-slate-700"
              />
              <span className="text-xs text-slate-300 font-medium">
                Enforce Strict Dual-MRP Detection (Flag any over-stickering as critical Section 36 violation)
              </span>
            </label>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4" />
              Settings updated successfully!
            </span>
          )}
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-sky-600/20"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
