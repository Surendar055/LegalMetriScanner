import React, { useState } from 'react';
import { Smartphone, RefreshCw, CheckCircle2, QrCode } from 'lucide-react';
import { useInspection } from '../../context/InspectionContext';

export const ConnectScannerCard = () => {
  const { connectedDevice, sessionInfo, refreshQrCode, setCurrentInterface } = useInspection();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshQrCode();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const isConnected = connectedDevice.status === 'Connected';

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-xs overflow-hidden">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        {/* Left Side: Header & REAL QR Code with Status */}
        <div className="flex-1 space-y-5">
          {/* Card Header */}
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
              isConnected
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                : 'bg-blue-50 text-blue-600 border-blue-100'
            }`}>
              <Smartphone className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#0B1B2B]">
                  Connect Mobile Scanner
                </h3>
                {isConnected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>CONNECTED ✓</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Waiting for device...</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 max-w-md">
                Scan the QR code with your mobile device to start inspecting packaged commodities.
              </p>
            </div>
          </div>

          {/* QR Code & Status Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pt-1">
            {/* Real Dynamic Scannable QR Code */}
            <div className="p-2 bg-white border border-slate-200 rounded-lg shadow-2xs shrink-0 relative group">
              {sessionInfo.qrCodeDataUrl ? (
                <img
                  src={sessionInfo.qrCodeDataUrl}
                  alt="Scan with phone camera to connect"
                  className="w-24 h-24 block object-contain"
                />
              ) : (
                <div className="w-24 h-24 bg-slate-50 flex items-center justify-center text-slate-400">
                  <QrCode className="w-8 h-8 animate-pulse text-slate-400" />
                </div>
              )}
            </div>

            {/* Waiting for device / Connected Status text & Controls */}
            <div className="space-y-2.5">
              <div>
                {isConnected ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>CONNECTED ✓ ({connectedDevice.name || 'Mobile Phone'})</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#0B1B2B]">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span>Waiting for device...</span>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isConnected
                    ? 'Scanner synced via Socket.IO. Ready to receive packages.'
                    : 'Scan the QR code with your phone camera on same Wi-Fi'}
                </p>
                {sessionInfo.mobileUrl && !isConnected && (
                  <p className="text-[10px] font-mono text-slate-400 mt-1 max-w-xs break-all">
                    {sessionInfo.mobileUrl}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs border border-slate-200 shadow-2xs transition-colors flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh QR</span>
                </button>

                <button
                  onClick={() => setCurrentInterface('mobile')}
                  className="px-3.5 py-1.5 rounded-lg bg-[#0B1B2B] hover:bg-[#152a42] text-white font-medium text-xs transition-colors shadow-2xs"
                >
                  Open Scanner
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Package & Mobile Phone Mockup Illustration */}
        <div className="w-full lg:w-72 bg-[#F1F5F9]/80 rounded-xl p-4 border border-slate-200/80 flex items-center justify-center gap-4 relative overflow-hidden select-none shrink-0">
          {/* Package bag */}
          <div className="w-28 h-36 bg-[#E2D5BE] rounded-lg border border-[#C5B495] shadow-xs p-2.5 flex flex-col justify-between relative transform -rotate-2">
            <div className="w-full h-1 bg-[#B5A17F]/50 rounded-full mb-1"></div>
            <div className="bg-white/95 rounded p-1.5 text-center shadow-2xs border border-[#C5B495]/40">
              <span className="text-[9px] font-bold text-slate-900 block leading-tight">
                Premium Rice
              </span>
              <span className="text-[8px] text-slate-600 block mt-0.5">
                Net Wt. 1 kg
              </span>
              {/* Mini barcode lines */}
              <div className="flex items-center justify-center gap-0.5 mt-1.5 h-3">
                <div className="w-0.5 h-full bg-black"></div>
                <div className="w-1 h-full bg-black"></div>
                <div className="w-0.5 h-full bg-black"></div>
                <div className="w-0.5 h-full bg-black"></div>
                <div className="w-1 h-full bg-black"></div>
                <div className="w-0.5 h-full bg-black"></div>
              </div>
            </div>
            <div className="text-[7px] text-[#8C7A5E] text-center font-mono">
              FSSAI / LMPC
            </div>
          </div>

          {/* Smartphone Scanning Mockup */}
          <div className="w-20 h-40 bg-[#0B1B2B] rounded-xl p-1.5 shadow-md border-2 border-slate-800 flex flex-col justify-between transform rotate-2">
            <div className="w-5 h-1 bg-slate-700 rounded-full mx-auto mb-1"></div>
            <div className="flex-1 bg-slate-900 rounded-md border border-slate-700/60 p-1 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="w-10 h-10 border border-emerald-400 rounded flex items-center justify-center">
                <svg className="w-7 h-7" viewBox="0 0 100 100" fill="none">
                  <rect x="10" y="10" width="30" height="30" fill="white" />
                  <rect x="60" y="10" width="30" height="30" fill="white" />
                  <rect x="10" y="60" width="30" height="30" fill="white" />
                </svg>
              </div>
              <div className="absolute inset-x-1 top-1/2 h-0.5 bg-emerald-400 animate-pulse"></div>
            </div>
            <div className="w-3 h-3 rounded-full bg-slate-800 mx-auto mt-1"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectScannerCard;
