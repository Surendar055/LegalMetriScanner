import React from 'react';
import { Check, AlertTriangle, X } from 'lucide-react';

export const StatusBadge = ({ status }) => {
  switch (status) {
    case 'Compliant':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Compliant</span>
        </span>
      );

    case 'Attention Required':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          <span>Attention Required</span>
        </span>
      );

    case 'Non-Compliant':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          <span>Non-Compliant</span>
        </span>
      );

    case 'Declarations Detected':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          <span>Declarations Detected</span>
        </span>
      );

    case 'Declarations Not Detected':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          <span>Declarations Not Detected</span>
        </span>
      );

    case 'Verification Incomplete':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          <span>Verification Incomplete</span>
        </span>
      );

    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 border border-slate-200">
          {status}
        </span>
      );
  }
};

export default StatusBadge;
