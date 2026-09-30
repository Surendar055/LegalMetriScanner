import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  FileSearch,
  FileText,
  BarChart2,
  Settings,
  ChevronRight
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { useInspection } from '../../context/InspectionContext';

export const Sidebar = () => {
  const { activeTab, setActiveTab } = useInspection();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new_inspection', label: 'New Inspection', icon: PlusCircle, hasArrow: true },
    { id: 'inspections', label: 'Inspections', icon: FileSearch, hasArrow: true },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-60 bg-[#0B1B2B] text-slate-300 flex flex-col shrink-0 min-h-screen select-none border-r border-[#12253B]">
      {/* Brand Logo Header */}
      <div className="p-5 pb-6">
        <Logo variant="dark" size="md" />
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#18324F] text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#12253B]/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-blue-400' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.hasArrow && (
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Footer Info */}
      <div className="p-5 pt-3">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="font-medium text-slate-200">System Online</span>
        </div>
        <p className="text-[11px] text-slate-500 font-mono mt-1">v1.0.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;
