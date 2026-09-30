import React, { useState } from 'react';
import { Laptop, Smartphone, CheckCircle2, QrCode, RotateCcw, Eye, FileText, ArrowRight } from 'lucide-react';
import { Logo } from '../common/Logo';
import { StatusBadge } from '../common/Badge';
import { useInspection } from '../../context/InspectionContext';

export const NewInspectionView = () => {
  const {
    connectedDevice,
    sessionInfo,
    liveScanState,
    resetLiveScan,
    openInspectionReport,
    openEvidenceModal,
    setCurrentInterface
  } = useInspection();

  const isConnected = connectedDevice.status === 'Connected';
  const hasScan = liveScanState.status === 'completed' && liveScanState.currentScan;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-8 sm:p-12 max-w-2xl mx-auto flex flex-col items-center text-center relative overflow-hidden">
      {/* Decorative ambient background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl pointer-events-none" />

      {/* Top Logo */}
      <div className="flex flex-col items-center mb-6">
        <Logo variant="light" size="lg" />
      </div>

      {/* Heading & Subtitle */}
      <h2 className="text-xl sm:text-2xl font-extrabold text-[#0B1B2B] tracking-tight">
        Connect Your Mobile Scanner
      </h2>
      <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md leading-relaxed">
        Scan the QR code below with your phone's camera to start scanning packages.
      </p>

      {/* Large QR Code with Blue Corner Scanning Frame */}
      <div className="relative my-8 p-6">
        {/* Blue Scanning Corner Brackets */}
        <div className={`absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 rounded-tl-lg ${isConnected ? 'border-emerald-500' : 'border-blue-500'}`} />
        <div className={`absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 rounded-tr-lg ${isConnected ? 'border-emerald-500' : 'border-blue-500'}`} />
        <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 rounded-bl-lg ${isConnected ? 'border-emerald-500' : 'border-blue-500'}`} />
        <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 rounded-br-lg ${isConnected ? 'border-emerald-500' : 'border-blue-500'}`} />

        {/* Real Dynamic QR Code Container */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-center">
          {sessionInfo.qrCodeDataUrl ? (
            <img
              src={sessionInfo.qrCodeDataUrl}
              alt="Scan QR code with smartphone"
              className="w-44 h-44 sm:w-52 sm:h-52 block object-contain"
            />
          ) : (
            <div className="w-44 h-44 sm:w-52 sm:h-52 bg-slate-50 flex items-center justify-center">
              <QrCode className="w-12 h-12 text-slate-400 animate-pulse" />
            </div>
          )}
        </div>
      </div>

      {/* Waiting Status / CONNECTED Card */}
      <div className={`w-full max-w-md rounded-xl p-4 text-center border ${
        isConnected
          ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
          : 'bg-amber-50/70 border-amber-200/80 text-amber-950'
      }`}>
        {isConnected ? (
          <div>
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>CONNECTED ✓</span>
            </div>
            <p className="text-xs text-emerald-700 mt-1 font-medium">
              Paired with {connectedDevice.name || 'Mobile Phone'}. Position packages in phone camera to inspect.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-amber-900">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>Waiting for mobile device to connect...</span>
            </div>
            <p className="text-[11px] text-amber-800/80 mt-1">
              Keep this page open and scan the QR code with your phone camera.
            </p>
            {sessionInfo.mobileUrl && (
              <p className="text-[10px] font-mono text-slate-500 mt-2 break-all bg-white/80 p-1.5 rounded border border-amber-200/60">
                {sessionInfo.mobileUrl}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Incoming Live Scan Card if available */}
      {hasScan && (
        <div className="w-full max-w-md mt-6 p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 text-left space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">
              Scan Received: {typeof liveScanState.currentScan.productName === 'object' && liveScanState.currentScan.productName !== null
                ? (liveScanState.currentScan.productName.value || 'Scanned Package')
                : (liveScanState.currentScan.productName || 'Scanned Package')}
            </span>
            <StatusBadge status={liveScanState.currentScan.status} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openInspectionReport(liveScanState.currentScan)}
              className="px-3 py-1.5 rounded-lg bg-[#0B1B2B] text-white text-xs font-medium"
            >
              View Report
            </button>
            <button
              onClick={resetLiveScan}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Bottom Network Guidance & Device Icons */}
      <div className="mt-8 pt-6 border-t border-slate-100 w-full flex flex-col items-center gap-2">
        <div className="flex items-center justify-center gap-4 text-slate-400">
          <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
            <Laptop className="w-5 h-5" />
          </div>

          {/* Dotted sync line */}
          <div className="flex items-center gap-1 text-slate-400 font-mono text-xs">
            <span>&larr;</span>
            <span className="tracking-widest">•••••••••</span>
            <span>&rarr;</span>
          </div>

          <div className={`p-2 rounded-lg ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
            <Smartphone className="w-5 h-5" />
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mt-1">
          Make sure both devices are on the same Wi-Fi network.
        </p>

        {/* Quick Launch Mobile Simulator Button for testing on laptop */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => setCurrentInterface('mobile')}
            className="px-4 py-2 rounded-lg bg-[#0B1B2B] hover:bg-[#152a42] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Open Mobile Scanner View</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewInspectionView;
