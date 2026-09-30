import React from 'react';
import { FileBarChart, Download, Filter, Calendar, AlertOctagon, CheckCircle2, AlertTriangle, FileText, ChevronRight } from 'lucide-react';
import { useInspection } from '../../context/InspectionContext';
import { StatusBadge } from '../common/Badge';

export const ReportsView = () => {
  const { inspections, openInspectionReport } = useInspection();

  const complianceBreakdown = [
    { rule: 'Rule 6(1)(e) — Maximum Retail Price (MRP) & Tax Declaration', count: 18, severity: 'High' },
    { rule: 'Rule 6(1)(c) — Net Quantity Underfill / Font Height Deficiency', count: 14, severity: 'Critical' },
    { rule: 'Rule 6(1)(a) — Incomplete Manufacturer / Packer Postal Address', count: 9, severity: 'Medium' },
    { rule: 'Rule 6(1)(f) — Omission of Consumer Grievance Contact', count: 7, severity: 'Medium' },
    { rule: 'Rule 18(2) — Overcharging / Dual Sticker Price Alteration', count: 5, severity: 'Critical' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Compliance & Enforcement Reports
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Legal Metrology Act, 2009 & Packaged Commodities Rules (PCR 2011) Summary
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 flex items-center gap-2 transition-colors">
            <Calendar className="w-3.5 h-3.5" />
            <span>September 2026</span>
          </button>
          <button className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors flex items-center gap-2 shadow-sm">
            <Download className="w-3.5 h-3.5" />
            <span>Export Enforcement Dossier</span>
          </button>
        </div>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-xs text-slate-400 block">Total Seizure / Notice Notices Issued</span>
          <span className="text-2xl font-bold font-mono text-rose-400 mt-1 block">28 Notices</span>
          <span className="text-[11px] text-slate-500 mt-2 block">Under Section 36(1) of Legal Metrology Act</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-xs text-slate-400 block">Cumulative Compound Penalty Collected</span>
          <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">₹ 14,20,000</span>
          <span className="text-[11px] text-slate-500 mt-2 block">Zone IV Enforcement division</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-xs text-slate-400 block">Overall PCR Compliance Index</span>
          <span className="text-2xl font-bold font-mono text-sky-400 mt-1 block">88.4%</span>
          <span className="text-[11px] text-slate-500 mt-2 block">+3.2% vs previous quarter</span>
        </div>
      </div>

      {/* Infraction Category Breakdown */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-amber-400" />
          Primary Packaged Commodity Deficiencies (NCR Ranking)
        </h3>

        <div className="space-y-3">
          {complianceBreakdown.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 font-mono flex items-center justify-center text-[11px]">
                  #{idx + 1}
                </span>
                <div>
                  <span className="font-semibold text-slate-200">{item.rule}</span>
                  <span className="text-slate-500 text-[11px] block mt-0.5">
                    Flagged during optical label analysis
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-white">{item.count} cases</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    item.severity === 'Critical'
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : item.severity === 'High'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                  }`}
                >
                  {item.severity}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Complete Inspection Audit Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
        <h3 className="text-sm font-bold text-white mb-3">All Generated Inspection Certificates</h3>
        <div className="divide-y divide-slate-800">
          {inspections.map((item) => (
            <div
              key={item.id}
              className="py-3 flex items-center justify-between text-xs hover:bg-slate-850/40 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-sky-400" />
                <div>
                  <span className="font-semibold text-white block">
                    {typeof item.productName === 'object' && item.productName !== null
                      ? (item.productName.value || 'Scanned Package')
                      : (item.productName || 'Scanned Package')}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">{item.id} • {item.barcode}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <StatusBadge status={item.status} size="sm" />
                <button
                  onClick={() => openInspectionReport(item)}
                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium"
                >
                  View Certificate
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
