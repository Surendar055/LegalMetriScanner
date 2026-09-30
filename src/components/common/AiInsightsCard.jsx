import React from 'react';
import { Sparkles, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Info } from 'lucide-react';
import { generateAiInsights } from '../../services/aiInsightsService';

export const AiInsightsCard = ({ scanData, compact = false }) => {
  if (!scanData) return null;

  const insights = scanData.aiInsights || generateAiInsights(scanData);
  if (!insights) return null;

  const { riskLevel, summary, insights: points = [], warnings = [], recommendedAction, disclaimer } = insights;

  const riskBadgeConfig = {
    LOW: {
      label: 'Risk Level: LOW',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotClass: 'bg-emerald-500',
      icon: ShieldCheck,
      iconColor: 'text-emerald-600',
      headerBg: 'from-emerald-50/70 to-white',
    },
    MEDIUM: {
      label: 'Risk Level: MEDIUM',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      dotClass: 'bg-amber-500',
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      headerBg: 'from-amber-50/70 to-white',
    },
    HIGH: {
      label: 'Risk Level: HIGH',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      dotClass: 'bg-rose-500 animate-pulse',
      icon: ShieldAlert,
      iconColor: 'text-rose-600',
      headerBg: 'from-rose-50/70 to-white',
    },
  }[riskLevel || 'LOW'];

  const RiskIcon = riskBadgeConfig.icon;

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden transition-all">
      {/* Top Banner */}
      <div className={`px-4 py-3 bg-gradient-to-r ${riskBadgeConfig.headerBg} border-b border-slate-100 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-600/10 text-blue-600 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 stroke-[2.2]" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-[#0B1B2B] tracking-tight flex items-center gap-1.5">
              <span>AI Inspection Insights</span>
              <span className="text-[10px] font-semibold text-slate-400 font-mono">v1.2</span>
            </h4>
          </div>
        </div>

        {/* Risk Badge */}
        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${riskBadgeConfig.badgeClass}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${riskBadgeConfig.dotClass}`}></span>
          <span>{riskBadgeConfig.label}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3.5 text-xs text-slate-700">
        {/* Summary */}
        <p className="text-xs leading-relaxed text-slate-800 font-medium">
          {summary}
        </p>

        {/* Detailed Points */}
        {(points.length > 0 || warnings.length > 0) && (
          <div className="space-y-1.5 pt-1">
            {points.map((pt, idx) => (
              <div key={`pt-${idx}`} className="flex items-start gap-2 text-[11px] text-slate-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{pt}</span>
              </div>
            ))}

            {warnings.map((warn, idx) => (
              <div key={`warn-${idx}`} className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50/60 p-2 rounded-lg border border-amber-200/60">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span className="leading-snug font-medium">{warn}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recommended Action */}
        {recommendedAction && (
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start gap-2">
            <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5 stroke-[2.5]" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Recommended Action
              </span>
              <span className="text-[11px] font-semibold text-[#0B1B2B]">
                {recommendedAction}
              </span>
            </div>
          </div>
        )}

        {/* Professional Disclaimer */}
        <div className="pt-1 flex items-center gap-1.5 text-[10px] text-slate-400 border-t border-slate-100">
          <Info className="w-3 h-3 text-slate-400 shrink-0" />
          <span>{disclaimer || 'AI-assisted preliminary verification • Requires manual verification'}</span>
        </div>
      </div>
    </div>
  );
};

export default AiInsightsCard;
