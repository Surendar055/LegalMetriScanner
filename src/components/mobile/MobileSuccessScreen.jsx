import React from 'react';
import { Check, Package, Smartphone } from 'lucide-react';

export const MobileSuccessScreen = ({ onBackToHome }) => {
  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-white select-none text-center">
      {/* Top spacing */}
      <div className="pt-6"></div>

      {/* Main Success Content */}
      <div className="flex flex-col items-center justify-center my-6">
        {/* Large Green Checkmark Circle */}
        <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-6">
          <Check className="w-8 h-8 stroke-[3]" />
        </div>

        {/* Heading & Subtitle */}
        <h2 className="text-xl font-extrabold text-[#0B1B2B] tracking-tight">
          Scan Completed!
        </h2>
        <p className="text-xs text-slate-500 mt-2 max-w-[260px] leading-relaxed">
          Your package image has been successfully sent for verification.
        </p>

        {/* Box + Phone Sync Graphic */}
        <div className="mt-8 relative w-40 h-32 flex items-center justify-center">
          <div className="absolute inset-0 bg-blue-50/60 rounded-full blur-xl scale-110" />

          {/* Cardboard Box */}
          <div className="w-20 h-20 bg-[#DEB887] rounded-lg shadow-md border-2 border-[#CD853F]/60 flex flex-col justify-between p-2 transform -rotate-6 z-10">
            <div className="w-full h-2 bg-[#D2B48C] border-y border-[#C4A47C]/80 -mx-2"></div>
            <div className="bg-white/90 rounded p-1 shadow-2xs">
              <div className="flex items-center gap-0.5 h-2">
                <div className="w-0.5 h-full bg-slate-800"></div>
                <div className="w-1 h-full bg-slate-800"></div>
                <div className="w-0.5 h-full bg-slate-800"></div>
                <div className="w-1 h-full bg-slate-800"></div>
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 self-end"></div>
          </div>

          {/* Smartphone with green check */}
          <div className="w-14 h-24 bg-[#0B1B2B] rounded-xl p-1 shadow-lg border-2 border-slate-700 flex flex-col justify-between transform rotate-6 z-20 -ml-4">
            <div className="w-4 h-1 bg-slate-700 rounded-full mx-auto"></div>
            <div className="flex-1 bg-slate-900 rounded flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-slate-800 mx-auto"></div>
          </div>
        </div>
      </div>

      {/* Bottom Button: Back to Home */}
      <div className="pb-2">
        <button
          onClick={onBackToHome}
          className="w-full py-3.5 px-4 rounded-xl bg-[#0B1B2B] hover:bg-[#152a42] text-white font-semibold text-xs tracking-wide shadow-md shadow-[#0B1B2B]/20 transition-all active:scale-98"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default MobileSuccessScreen;
