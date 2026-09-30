import React from 'react';
import { BarChart3, TrendingUp, ShieldAlert, CheckCircle2, PieChart, Activity } from 'lucide-react';
import { useInspection } from '../../context/InspectionContext';

export const AnalyticsView = () => {
  const { stats, inspections } = useInspection();

  const categories = [
    { name: 'Food & Edible Oils', pass: 88, fail: 12, total: 420 },
    { name: 'Cosmetics & Toiletries', pass: 76, fail: 24, total: 310 },
    { name: 'Household Chemicals', pass: 92, fail: 8, total: 240 },
    { name: 'Packaged Snacks', pass: 68, fail: 32, total: 190 },
    { name: 'Beverages & Water', pass: 84, fail: 16, total: 124 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          Legal Metrology Analytical Intelligence
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time compliance distributions, high-risk sector alerts, and field scanner telemetry
        </p>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-xs text-slate-400">Total Scans Audited</span>
          <div className="text-2xl font-bold font-mono text-white mt-1">1,284</div>
          <span className="text-[11px] text-emerald-400 mt-2 block">+14% month-over-month</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-xs text-slate-400">Average Compliance Rate</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">81.6%</div>
          <span className="text-[11px] text-slate-400 mt-2 block">Benchmark target: 80%</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-xs text-slate-400">High-Risk Infractions</span>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">94 Lots</div>
          <span className="text-[11px] text-rose-400 mt-2 block">Flagged for seizure</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <span className="text-xs text-slate-400">OCR AI Inference Speed</span>
          <div className="text-2xl font-bold font-mono text-sky-400 mt-1">340 ms</div>
          <span className="text-[11px] text-slate-400 mt-2 block">Edge neural acceleration</span>
        </div>
      </div>

      {/* Category Risk Breakdown */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" />
          Sector Compliance vs Non-Compliance Distribution
        </h3>

        <div className="space-y-4">
          {categories.map((c, i) => (
            <div key={i} className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">{c.name}</span>
                <span className="font-mono text-slate-400">
                  <strong className="text-emerald-400">{c.pass}%</strong> Compliant /{' '}
                  <strong className="text-rose-400">{c.fail}%</strong> Deficit ({c.total} items)
                </span>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden flex border border-slate-800">
                <div
                  className="bg-emerald-500 h-full rounded-l-full"
                  style={{ width: `${c.pass}%` }}
                />
                <div
                  className="bg-rose-500 h-full rounded-r-full"
                  style={{ width: `${c.fail}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
