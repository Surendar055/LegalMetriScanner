import React from 'react';
import { UserCheck, Check, Lightbulb, AlertTriangle, ArrowUp } from 'lucide-react';

export const StatCard = ({ title, value, change, timeFrame = "vs. last 7 days", type }) => {
  const configs = {
    total: {
      icon: UserCheck,
      iconBg: 'bg-blue-100/90 text-blue-600',
    },
    compliant: {
      icon: Check,
      iconBg: 'bg-emerald-100/90 text-emerald-600',
    },
    attention: {
      icon: Lightbulb,
      iconBg: 'bg-amber-100/90 text-amber-600',
    },
    nonCompliant: {
      icon: AlertTriangle,
      iconBg: 'bg-rose-100/90 text-rose-600',
    },
  };

  const cfg = configs[type] || configs.total;
  const Icon = cfg.icon;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex items-start gap-4">
      {/* Icon Box */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
        <Icon className="w-5 h-5 stroke-[2.2]" />
      </div>

      {/* Metric Content */}
      <div className="flex-1 min-w-0">
        <span className="text-xs font-normal text-slate-500 block truncate">
          {title}
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold tracking-tight text-[#0B1B2B]">
            {value}
          </span>
          {change && (
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
              <ArrowUp className="w-3 h-3 stroke-[2.5]" />
              {change.replace('+', '').trim()}
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-400 mt-1">{timeFrame}</p>
      </div>
    </div>
  );
};

export default StatCard;
