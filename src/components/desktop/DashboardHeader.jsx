import React from 'react';
import { User, LogOut, ShieldCheck } from 'lucide-react';
import { useInspection } from '../../context/InspectionContext';
import { useAuth } from '../../context/AuthContext';

export const DashboardHeader = () => {
  const { systemOnline } = useInspection();
  const { user, logout } = useAuth();

  return (
    <div className="space-y-4">
      {/* Top right status bar */}
      <div className="flex items-center justify-end gap-3.5">
        {/* System Online badge */}
        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>System Online</span>
        </div>

        {/* Authenticated Officer Badge & Details */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-[#0B1B2B] text-white flex items-center justify-center shadow-xs">
            <User className="w-4 h-4" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold text-[#0B1B2B] leading-tight">
              {user?.name || 'Officer R. Sharma'}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {user?.badgeId || 'LMS-GOV-2026-088'}
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Sign out of Inspector Account"
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Greeting Title & Subtitle */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0B1B2B]">
          Good Morning, {user?.name ? user.name.split(' ')[0] : 'Inspector'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Verify packaged commodities. Ensure compliance. Protect consumers.
        </p>
      </div>
    </div>
  );
};

export default DashboardHeader;
