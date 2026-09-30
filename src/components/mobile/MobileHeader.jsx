import React from 'react';
import { ShieldCheck, Wifi, Monitor, ArrowLeft, RefreshCw } from 'lucide-react';
import { useInspection } from '../../context/InspectionContext';

export const MobileHeader = ({ isEmbedded }) => {
  const { connectedDevice, setCurrentInterface } = useInspection();

  return (
    <header className="px-4 py-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
      {/* Brand & Title */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 border border-sky-400/30">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm font-extrabold text-white tracking-tight">
              LegalMetriScan
            </h1>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-sky-500/20 text-sky-400 font-semibold border border-sky-500/30">
              GOV
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
            Package Verification
          </p>
        </div>
      </div>

      {/* Right: Connection Status & Back to Laptop Console */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-950 border border-slate-800 text-[10px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-emerald-400">Station Synced</span>
        </div>

        {!isEmbedded && (
          <button
            onClick={() => setCurrentInterface('desktop')}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1 text-[11px] font-medium"
            title="Return to Laptop Dashboard"
          >
            <Monitor className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Laptop Station</span>
          </button>
        )}
      </div>
    </header>
  );
};
