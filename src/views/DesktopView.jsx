import React from 'react';
import { Sidebar } from '../components/desktop/Sidebar';
import { DashboardHeader } from '../components/desktop/DashboardHeader';
import { StatCard } from '../components/common/StatCard';
import { ConnectScannerCard } from '../components/desktop/ConnectScannerCard';
import { RecentInspectionsTable } from '../components/desktop/RecentInspectionsTable';
import { NewInspectionView } from '../components/desktop/NewInspectionView';
import { ReportsView } from '../components/desktop/ReportsView';
import { AnalyticsView } from '../components/desktop/AnalyticsView';
import { SettingsView } from '../components/desktop/SettingsView';
import { useInspection } from '../context/InspectionContext';
import { STATS_DATA } from '../data/mockData';

export const DesktopView = () => {
  const { activeTab } = useInspection();

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-800 font-sans">
      {/* Dark Navy Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <main className="flex-1 p-6 lg:p-8 w-full max-w-[1440px] mx-auto space-y-6">
          {/* TAB 1: DASHBOARD (Matches exact layout from screenshot) */}
          {activeTab === 'dashboard' && (
            <>
              {/* Header Greeting & System Online indicator */}
              <DashboardHeader />

              {/* 4 Statistics KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title={STATS_DATA.total.label}
                  value={STATS_DATA.total.value}
                  change={STATS_DATA.total.change}
                  timeFrame={STATS_DATA.total.timeFrame}
                  type="total"
                />
                <StatCard
                  title={STATS_DATA.compliant.label}
                  value={STATS_DATA.compliant.value}
                  change={STATS_DATA.compliant.change}
                  timeFrame={STATS_DATA.compliant.timeFrame}
                  type="compliant"
                />
                <StatCard
                  title={STATS_DATA.attention.label}
                  value={STATS_DATA.attention.value}
                  change={STATS_DATA.attention.change}
                  timeFrame={STATS_DATA.attention.timeFrame}
                  type="attention"
                />
                <StatCard
                  title={STATS_DATA.nonCompliant.label}
                  value={STATS_DATA.nonCompliant.value}
                  change={STATS_DATA.nonCompliant.change}
                  timeFrame={STATS_DATA.nonCompliant.timeFrame}
                  type="nonCompliant"
                />
              </div>

              {/* Large Connect Mobile Scanner Card */}
              <ConnectScannerCard />

              {/* Recent Inspections Table Card */}
              <RecentInspectionsTable />
            </>
          )}

          {/* TAB 2: NEW INSPECTION (Connect Mobile Scanner full screen) */}
          {activeTab === 'new_inspection' && <NewInspectionView />}

          {/* TAB 3: INSPECTIONS LIST */}
          {activeTab === 'inspections' && <RecentInspectionsTable />}

          {/* TAB 4: REPORTS */}
          {activeTab === 'reports' && <ReportsView />}

          {/* TAB 5: ANALYTICS */}
          {activeTab === 'analytics' && <AnalyticsView />}

          {/* TAB 6: SETTINGS */}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
};

export default DesktopView;
