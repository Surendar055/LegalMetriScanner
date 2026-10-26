import React from 'react';
import { Package, ShieldCheck } from 'lucide-react';
import { Logo } from '../common/Logo';
import { useInspection } from '../../context/InspectionContext';

export const MobileWelcomeScreen = ({ onGetStarted }) => {
  const { connectedDevice } = useInspection();
  const isConnected = connectedDevice?.status === 'Connected';
  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-white select-none">
      {/* Top Header Logo */}
      <div className="flex flex-col items-center pt-8 text-center">
        <Logo variant="light" size="md" />
      </div>

      {/* Center 3D Package Illustration */}
      <div className="flex flex-col items-center justify-center my-6">
        <div className="relative w-36 h-36 flex items-center justify-center">
          {/* Subtle soft backdrop ring */}
          <div className="absolute inset-0 bg-blue-50 rounded-full blur-xl scale-110" />

          {/* Cardboard Box Illustration */}
          <div className="relative w-28 h-28 bg-[#DEB887] rounded-xl shadow-lg border-2 border-[#CD853F]/60 flex flex-col justify-between p-2.5 overflow-hidden">
            {/* Top Tape */}
            <div className="w-full h-3 bg-[#D2B48C] border-y border-[#C4A47C]/80 -mx-2.5"></div>

            {/* Shipping Label on Box */}
            <div className="bg-white/95 rounded p-1.5 shadow-2xs border border-slate-200">
              <div className="w-8 h-1 bg-slate-400 rounded-full mb-1"></div>
              <div className="flex items-center gap-0.5 h-2.5">
                <div className="w-0.5 h-full bg-slate-800"></div>
                <div className="w-1 h-full bg-slate-800"></div>
                <div className="w-0.5 h-full bg-slate-800"></div>
                <div className="w-1 h-full bg-slate-800"></div>
                <div className="w-0.5 h-full bg-slate-800"></div>
              </div>
            </div>

            {/* Green Eco / Verification check icon */}
            <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center self-end shadow-xs">
              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
        </div>

        {/* Title & Subtitle */}
        <h2 className="text-lg font-extrabold text-[#0B1B2B] mt-6 tracking-tight text-center">
          Scan. Verify. Protect.
        </h2>
        <p className="text-xs text-slate-500 text-center mt-2 max-w-[260px] leading-relaxed">
          Ensure compliance with legal metrology requirements for packaged commodities.
        </p>
      </div>

      {/* Bottom Action Area */}
      <div className="space-y-4 pb-2">
        <button
          onClick={onGetStarted}
          className="w-full py-3.5 px-4 rounded-xl bg-[#0B1B2B] hover:bg-[#152a42] text-white font-semibold text-xs tracking-wide shadow-md shadow-[#0B1B2B]/20 transition-all active:scale-98"
        >
          Get Started
        </button>

        <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-600">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
          <span>{isConnected ? 'Connected to Laptop' : 'Connecting to Laptop...'}</span>
        </div>
      </div>
    </div>
  );
};

export default MobileWelcomeScreen;
