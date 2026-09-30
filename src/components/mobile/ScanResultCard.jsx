import React from 'react';
import {
  RotateCcw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  MapPin,
  Tag,
  Scale,
  Sparkles,
  Send,
  Check,
  ShieldCheck
} from 'lucide-react';
import { StatusBadge } from '../common/Badge';

export const ScanResultCard = ({
  result,
  isProcessing,
  processingStep,
  onScanAnother,
  onViewEvidence,
  onPushToConsole,
  pushed
}) => {
  // If in processing state, render processing skeleton and animated neural stages
  if (isProcessing) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-6 bg-slate-950 animate-in fade-in duration-200">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-slate-800 border-t-sky-500 animate-spin flex items-center justify-center" />
          <Sparkles className="w-8 h-8 text-sky-400 absolute inset-0 m-auto animate-pulse" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">Processing Package Label...</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Extracting text declarations and cross-verifying Legal Metrology compliance rules.
          </p>
        </div>

        {/* Processing step chips */}
        <div className="w-full max-w-xs space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-300">1. Neural OCR Extraction</span>
            <span className="text-[10px] font-mono text-emerald-400 font-semibold">Done</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-300">2. LMPC Rule 6 Verification</span>
            <span className="text-[10px] font-mono text-sky-400 font-semibold animate-pulse">
              Analyzing...
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-slate-300">3. Net Qty & MPE Error Check</span>
            <span className="text-[10px] font-mono text-slate-500">Pending</span>
          </div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const d = result.details || {};

  const getVal = (f) => (f && typeof f === 'object' && 'value' in f) ? f.value : (f || 'N/A');

  return (
    <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between space-y-4 bg-slate-950 overflow-y-auto">
      {/* Captured Image Preview & Status Badge */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl max-h-52 shrink-0 group">
        <img
          src={result.evidenceImageUrl}
          alt={getVal(result.productName) || 'Scanned Package'}
          className="w-full h-48 object-cover"
        />

        {/* Overlay Badges */}
        <div className="absolute top-3 left-3 z-10">
          <StatusBadge status={result.status} size="md" />
        </div>

        <div className="absolute bottom-2 inset-x-2 p-2 bg-slate-950/80 backdrop-blur-md rounded-xl border border-white/10 flex items-center justify-between text-xs">
          <span className="font-semibold text-white truncate max-w-[200px]">
            {getVal(result.productName) || 'Scanned Package'}
          </span>
          <span className="font-mono text-[10px] text-sky-300 bg-sky-500/20 px-2 py-0.5 rounded">
            Score: {result.score ?? 'N/A'}/100
          </span>
        </div>
      </div>

      {/* Mock Verification Results Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg backdrop-blur">
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Mandatory Declarations Audit
          </span>
          <span className="font-mono text-[10px] text-slate-500">LMPC ACT 2009</span>
        </div>

        {/* Core Declarations (MRP, Net Qty, Manufacturer, Address) */}
        <div className="space-y-3 text-xs">
          {/* MRP */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start justify-between">
            <div>
              <span className="text-slate-400 block text-[11px] font-medium">
                Maximum Retail Price (MRP)
              </span>
              <span className="font-mono text-base font-bold text-white mt-0.5 block">
                {getVal(d.mrp)}
              </span>
              <span className="text-[10px] text-slate-400">{d.mrpRaw}</span>
            </div>
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Tax Clause OK
            </span>
          </div>

          {/* Net Quantity */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start justify-between">
            <div>
              <span className="text-slate-400 block text-[11px] font-medium">
                Net Quantity
              </span>
              <span className="font-mono text-base font-bold text-emerald-400 mt-0.5 block">
                {getVal(d.netQuantity)}
              </span>
              <span className="text-[10px] text-slate-400">
                Unit Sale Price: {d.unitSalePrice || 'N/A'}
              </span>
            </div>
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              SI Standard
            </span>
          </div>

          {/* Manufacturer & Address */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-slate-400 block text-[11px] font-medium">
              Manufacturer & Packer
            </span>
            <span className="font-semibold text-slate-200 block text-xs">
              {getVal(d.manufacturer) !== 'Not detected' ? getVal(d.manufacturer) : (getVal(d.marketer) !== 'Not detected' ? getVal(d.marketer) : 'N/A')}
            </span>
            <div className="flex items-start gap-1.5 pt-1 text-slate-400 text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
              <span>{getVal(d.address)}</span>
            </div>
          </div>
        </div>

        {/* Verification Rules Checklist */}
        <div className="space-y-1.5 pt-1">
          {(result.verifications || []).slice(0, 3).map((v, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-1 px-2 rounded bg-slate-950/40 text-[11px]"
            >
              <span className="text-slate-300 truncate max-w-[210px]">
                {v.rule} {v.name}
              </span>
              <span
                className={`font-semibold uppercase text-[10px] ${
                  v.status === 'Pass'
                    ? 'text-emerald-400'
                    : v.status === 'Warning'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {v.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Buttons: View Evidence & Scan Another */}
      <div className="space-y-2 pt-1 pb-2">
        <div className="grid grid-cols-2 gap-2">
          {/* Button: View Evidence */}
          <button
            onClick={() => onViewEvidence(result)}
            className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold text-xs transition-colors border border-slate-700 flex items-center justify-center gap-1.5 active:scale-98 shadow"
          >
            <Eye className="w-4 h-4 text-sky-400" />
            <span>View Evidence</span>
          </button>

          {/* Button: Scan Another */}
          <button
            onClick={onScanAnother}
            className="py-3 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 active:scale-98 shadow-lg shadow-sky-600/20"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Scan Another</span>
          </button>
        </div>

        {/* Sync to Station Button */}
        <button
          onClick={onPushToConsole}
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 border ${
            pushed
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30'
          }`}
        >
          {pushed ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Transmitted to Inspector Dashboard</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Broadcast Scan to Laptop Console</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
