import React from 'react';
import { StatusBadge } from '../common/Badge';
import { useInspection } from '../../context/InspectionContext';

export const RecentInspectionsTable = () => {
  const { inspections, openInspectionReport, setActiveTab } = useInspection();

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#0B1B2B]">
          Recent Inspections
        </h3>
        <button
          onClick={() => setActiveTab('inspections')}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
        >
          <span>View all</span>
          <span>&rarr;</span>
        </button>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-medium select-none bg-slate-50/50">
              <th className="py-3 px-6 w-12">#</th>
              <th className="py-3 px-6">Product Name</th>
              <th className="py-3 px-6">Date & Time</th>
              <th className="py-3 px-6">Status</th>
              <th className="py-3 px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {inspections.map((item, index) => (
              <tr
                key={item.id}
                className="hover:bg-slate-50/60 transition-colors"
              >
                {/* Index Number */}
                <td className="py-3.5 px-6 font-medium text-slate-500">
                  {index + 1}
                </td>

                {/* Product Name */}
                <td className="py-3.5 px-6 font-semibold text-[#0B1B2B]">
                  {typeof item.productName === 'object' && item.productName !== null
                    ? (item.productName.value || 'Scanned Package')
                    : (item.productName || 'Scanned Package')}
                </td>

                {/* Date & Time */}
                <td className="py-3.5 px-6 text-slate-500 font-medium">
                  {item.displayDate || new Date(item.timestamp).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </td>

                {/* Status Badge & Verdict */}
                <td className="py-3.5 px-6">
                  <div className="flex flex-col gap-0.5">
                    <StatusBadge status={item.status} />
                    {item.verdict && (
                      <span className="text-[10px] text-slate-500 font-medium truncate max-w-xs">
                        {item.verdict}
                      </span>
                    )}
                  </div>
                </td>

                {/* Action: View button */}
                <td className="py-3.5 px-6 text-right">
                  <button
                    onClick={() => openInspectionReport(item)}
                    className="px-3.5 py-1 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-colors"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentInspectionsTable;
