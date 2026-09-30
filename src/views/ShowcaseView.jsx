import React from 'react';
import { Sidebar } from '../components/desktop/Sidebar';
import { DashboardHeader } from '../components/desktop/DashboardHeader';
import { StatCard } from '../components/common/StatCard';
import { ConnectScannerCard } from '../components/desktop/ConnectScannerCard';
import { RecentInspectionsTable } from '../components/desktop/RecentInspectionsTable';
import { NewInspectionView } from '../components/desktop/NewInspectionView';
import { MobileView } from './MobileView';
import { STATS_DATA } from '../data/mockData';

export const ShowcaseView = () => {
  return (
    <div className="w-full bg-[#EBF1F6] p-6 lg:p-8 space-y-8 min-h-screen">
      {/* Top Banner indicating Complete Reference Layout */}
      <div className="flex items-center justify-between border-b border-slate-300 pb-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Design Board View
          </span>
          <h2 className="text-lg font-extrabold text-[#0B1B2B]">
            LegalMetriScan Complete Interface Suite
          </h2>
        </div>
        <span className="text-xs font-medium bg-white text-slate-700 px-3 py-1 rounded-full border border-slate-300 shadow-2xs">
          Matches Reference Image Layout
        </span>
      </div>

      {/* TOP ROW: Laptop Dashboard (Left) + Connect Scanner Screen (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* TOP LEFT: Laptop Inspector Dashboard (approx 8 cols) */}
        <div className="xl:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex min-h-[620px]">
          {/* Sidebar */}
          <Sidebar />

          {/* Dashboard Main Content */}
          <div className="flex-1 p-6 space-y-5 bg-[#F8FAFC] overflow-hidden">
            <DashboardHeader />

            {/* 4 Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                title={STATS_DATA.total.label}
                value={STATS_DATA.total.value}
                change={STATS_DATA.total.change}
                type="total"
              />
              <StatCard
                title={STATS_DATA.compliant.label}
                value={STATS_DATA.compliant.value}
                change={STATS_DATA.compliant.change}
                type="compliant"
              />
              <StatCard
                title={STATS_DATA.attention.label}
                value={STATS_DATA.attention.value}
                change={STATS_DATA.attention.change}
                type="attention"
              />
              <StatCard
                title={STATS_DATA.nonCompliant.label}
                value={STATS_DATA.nonCompliant.value}
                change={STATS_DATA.nonCompliant.change}
                type="nonCompliant"
              />
            </div>

            {/* Connect Mobile Scanner Banner */}
            <ConnectScannerCard />

            {/* Recent Inspections Table */}
            <RecentInspectionsTable />
          </div>
        </div>

        {/* TOP RIGHT: Connect Your Mobile Scanner Screen (approx 4 cols) */}
        <div className="xl:col-span-4 flex flex-col justify-center">
          <NewInspectionView />
        </div>
      </div>

      {/* BOTTOM ROW: The 5 Mobile Screens in Sequence */}
      <div>
        <div className="mb-4">
          <h3 className="text-sm font-bold text-[#0B1B2B] uppercase tracking-wider">
            Mobile Interface Flow (5 Screens)
          </h3>
          <p className="text-xs text-slate-500">
            Welcome &bull; Live Camera &bull; OCR Processing &bull; Verification Result &bull; Scan Completed
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 justify-items-center">
          {/* Screen 1: Welcome */}
          <div className="w-full flex flex-col items-center">
            <span className="text-[11px] font-semibold text-slate-500 mb-2">1. Welcome Screen</span>
            <MobileView isEmbedded={true} forcedStep="welcome" />
          </div>

          {/* Screen 2: Camera */}
          <div className="w-full flex flex-col items-center">
            <span className="text-[11px] font-semibold text-slate-500 mb-2">2. Camera View</span>
            <MobileView isEmbedded={true} forcedStep="camera" />
          </div>

          {/* Screen 3: Processing */}
          <div className="w-full flex flex-col items-center">
            <span className="text-[11px] font-semibold text-slate-500 mb-2">3. Processing Screen</span>
            <MobileView isEmbedded={true} forcedStep="processing" />
          </div>

          {/* Screen 4: Result */}
          <div className="w-full flex flex-col items-center">
            <span className="text-[11px] font-semibold text-slate-500 mb-2">4. Verification Result</span>
            <MobileView isEmbedded={true} forcedStep="result" />
          </div>

          {/* Screen 5: Completed */}
          <div className="w-full flex flex-col items-center">
            <span className="text-[11px] font-semibold text-slate-500 mb-2">5. Scan Completed</span>
            <MobileView isEmbedded={true} forcedStep="success" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowcaseView;
