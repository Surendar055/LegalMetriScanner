import React from 'react';
import { User } from 'lucide-react';
import { useInspection } from '../../context/InspectionContext';

export const DashboardHeader = () => {
  const { systemOnline } = useInspection();

  return (
    <div className="space-y-4">
      {/* Top right status bar */}
      <div className="flex items-center justify-end gap-4">
        {/* System Online badge */}
        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>System Online</span>
        </div>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-[#0B1B2B] text-white flex items-center justify-center shadow-xs">
          <User className="w-4 h-4" />
        </div>
      </div>

      {/* Greeting Title & Subtitle */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0B1B2B]">
          Good Morning, Inspector
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Verify packaged commodities. Ensure compliance. Protect consumers.
        </p>
      </div>
    </div>
  );
};

export default DashboardHeader;
