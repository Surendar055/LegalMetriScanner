import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Camera,
  Layers,
  ArrowUpDown,
  PlusCircle,
  Package,
  Calendar,
  CalendarDays,
  X,
  ChevronDown,
  Clock,
  Check
} from 'lucide-react';
import { StatusBadge } from '../common/Badge';
import { useInspection } from '../../context/InspectionContext';
import {
  downloadInspectionPdf,
  downloadAllInspectionsPdf,
  downloadInspectionJson,
  downloadInspectionsCsv,
  formatToShortDate,
  isItemInDateRange
} from '../../utils/reportGenerator';

export const ItemsSectionView = () => {
  const { inspections, openInspectionReport, openEvidenceModal, setActiveTab } = useInspection();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [tableDateFilter, setTableDateFilter] = useState('ALL'); // 'ALL' | 'WEEK' | 'MONTH'

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportRangeType, setExportRangeType] = useState('WEEK'); // 'WEEK' | 'MONTH' | 'ALL' | 'CUSTOM'

  // Default custom dates: 7 days ago until today (YYYY-MM-DD)
  const todayStr = new Date().toISOString().slice(0, 10);
  const sevenDaysAgoStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [customStart, setCustomStart] = useState(sevenDaysAgoStr);
  const [customEnd, setCustomEnd] = useState(todayStr);

  // Table Filtered Items (Status + Search + Table Date Filter)
  const filteredItems = useMemo(() => {
    return inspections.filter((item) => {
      // 1. Status Filter
      if (statusFilter === 'COMPLIANT' && item.status !== 'Compliant') return false;
      if (statusFilter === 'ATTENTION' && item.status !== 'Attention Required') return false;
      if (statusFilter === 'NON_COMPLIANT' && item.status !== 'Non-Compliant') return false;

      // 2. Table Date Filter
      if (tableDateFilter !== 'ALL' && !isItemInDateRange(item, tableDateFilter)) return false;

      // 3. Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      const prodName = typeof item.productName === 'object' && item.productName !== null
        ? (item.productName.value || '')
        : (item.productName || '');

      const barcode = item.barcode || '';
      const id = item.id || '';
      const category = item.category || '';
      const mfr = item.details?.manufacturer?.value || item.details?.manufacturer || '';
      const batch = item.details?.batchNumber?.value || item.details?.batch || '';

      return (
        prodName.toLowerCase().includes(q) ||
        barcode.toLowerCase().includes(q) ||
        id.toLowerCase().includes(q) ||
        category.toLowerCase().includes(q) ||
        String(mfr).toLowerCase().includes(q) ||
        String(batch).toLowerCase().includes(q)
      );
    });
  }, [inspections, searchQuery, statusFilter, tableDateFilter]);

  // Items filtered specifically for Export according to Export Modal selection
  const exportItems = useMemo(() => {
    return inspections.filter((item) => {
      return isItemInDateRange(item, exportRangeType, customStart, customEnd);
    });
  }, [inspections, exportRangeType, customStart, customEnd]);

  // Period label for export report header
  const exportPeriodLabel = useMemo(() => {
    if (exportRangeType === 'WEEK') return 'Past 7 Days (1 Week)';
    if (exportRangeType === 'MONTH') return 'Past 30 Days (1 Month)';
    if (exportRangeType === 'CUSTOM') {
      const s = formatToShortDate(customStart);
      const e = formatToShortDate(customEnd);
      return `Custom Period (${s} to ${e})`;
    }
    return 'All Time (Full Dossier)';
  }, [exportRangeType, customStart, customEnd]);

  // Counts for KPI pills
  const counts = useMemo(() => ({
    total: inspections.length,
    compliant: inspections.filter((i) => i.status === 'Compliant').length,
    attention: inspections.filter((i) => i.status === 'Attention Required').length,
    nonCompliant: inspections.filter((i) => i.status === 'Non-Compliant').length,
  }), [inspections]);

  // Counts for Date Range presets in Export Modal
  const dateRangeCounts = useMemo(() => ({
    week: inspections.filter((i) => isItemInDateRange(i, 'WEEK')).length,
    month: inspections.filter((i) => isItemInDateRange(i, 'MONTH')).length,
    all: inspections.length,
  }), [inspections]);

  const getVal = (val) => {
    if (val && typeof val === 'object' && 'value' in val) return val.value;
    return val || 'Not detected';
  };

  const handleExportPdf = () => {
    downloadAllInspectionsPdf(exportItems, exportPeriodLabel);
    setIsExportModalOpen(false);
  };

  const handleExportCsv = () => {
    downloadInspectionsCsv(exportItems, exportPeriodLabel);
    setIsExportModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Package className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#0B1B2B] tracking-tight">
                Scanned Items Inventory
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All commodity packages scanned, analyzed, and stored with statutory compliance records
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Main Export Options Button with Date Range Selection */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            id="open-export-options-btn"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            title="Choose date range (1 week, 1 month, or custom) and export as PDF or CSV"
          >
            <Calendar className="w-4 h-4" />
            <span>Export Report (Select Date)</span>
          </button>

          <button
            onClick={() => downloadInspectionsCsv(filteredItems, 'Current_View')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-colors flex items-center gap-2 cursor-pointer"
            title="Download items database in CSV spreadsheet format"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setActiveTab('new_inspection')}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Scan New Item</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'ALL'
              ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-slate-200/90 hover:bg-slate-50/70'
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Items</span>
          <span className="text-2xl font-bold font-mono text-[#0B1B2B] mt-0.5 block">{counts.total}</span>
        </button>

        <button
          onClick={() => setStatusFilter('COMPLIANT')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'COMPLIANT'
              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200/90 hover:bg-slate-50/70'
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">Compliant</span>
          <span className="text-2xl font-bold font-mono text-emerald-600 mt-0.5 block">{counts.compliant}</span>
        </button>

        <button
          onClick={() => setStatusFilter('ATTENTION')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'ATTENTION'
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-slate-200/90 hover:bg-slate-50/70'
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">Attention Required</span>
          <span className="text-2xl font-bold font-mono text-amber-600 mt-0.5 block">{counts.attention}</span>
        </button>

        <button
          onClick={() => setStatusFilter('NON_COMPLIANT')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'NON_COMPLIANT'
              ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-slate-200/90 hover:bg-slate-50/70'
          }`}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block">Non-Compliant</span>
          <span className="text-2xl font-bold font-mono text-rose-600 mt-0.5 block">{counts.nonCompliant}</span>
        </button>
      </div>

      {/* Search & Filter Toolbar with Date Range Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items by product name, barcode, batch, manufacturer..."
            className="w-full pl-9 pr-4 py-2 rounded-lg text-xs bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap">
          {/* Quick Date Range Filter for the table view */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <span className="text-[11px] font-semibold text-slate-500 pl-2 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              Date:
            </span>
            <button
              onClick={() => setTableDateFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                tableDateFilter === 'ALL'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setTableDateFilter('WEEK')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                tableDateFilter === 'WEEK'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1 Week
            </button>
            <button
              onClick={() => setTableDateFilter('MONTH')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                tableDateFilter === 'MONTH'
                  ? 'bg-white text-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1 Month
            </button>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{filteredItems.length}</strong> of {inspections.length} items
          </span>
        </div>
      </div>

      {/* Main Items Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-medium select-none bg-slate-50/60">
                <th className="py-3.5 px-5 w-12 text-center">#</th>
                <th className="py-3.5 px-5">Item / Product Name</th>
                <th className="py-3.5 px-5">Scan Date</th>
                <th className="py-3.5 px-5">Statutory Declarations</th>
                <th className="py-3.5 px-5">Audit Status</th>
                <th className="py-3.5 px-5 text-right">Actions & Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Package className="w-10 h-10 stroke-[1.5] text-slate-300 mb-2" />
                      <span className="text-sm font-semibold text-slate-600">No scanned items found</span>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        {searchQuery
                          ? 'No items matched your search filter. Try clearing your search term.'
                          : tableDateFilter !== 'ALL'
                          ? `No items found in the selected date range (${tableDateFilter === 'WEEK' ? '1 Week' : '1 Month'}).`
                          : 'No items scanned yet. Use the mobile scanner or simulator to scan a commodity package.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const d = item.details || {};
                  const prodName = typeof item.productName === 'object' && item.productName !== null
                    ? (item.productName.value || 'Scanned Package')
                    : (item.productName || 'Scanned Package');

                  const mrpVal = getVal(d.mrp);
                  const netQtyVal = getVal(d.netQuantity);
                  const fssaiVal = getVal(d.fssaiNumber);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Index */}
                      <td className="py-4 px-5 text-center font-mono font-medium text-slate-400">
                        {index + 1}
                      </td>

                      {/* Product Name & Visual Thumbnail */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          {/* Evidence Thumbnail */}
                          {item.evidenceImageUrl ? (
                            <button
                              onClick={() => openEvidenceModal(item)}
                              className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shrink-0 relative group/thumb hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer"
                              title="Click to view optical capture evidence"
                            >
                              <img
                                src={item.evidenceImageUrl}
                                alt={prodName}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                                <Camera className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-blue-50/80 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                              <Package className="w-6 h-6 stroke-[1.8]" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <span className="font-bold text-sm text-[#0B1B2B] block truncate max-w-xs group-hover:text-blue-600 transition-colors">
                              {prodName}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono">
                              <span>#{item.id}</span>
                              {item.barcode && item.barcode !== 'N/A' && (
                                <>
                                  <span>•</span>
                                  <span>{item.barcode}</span>
                                </>
                              )}
                              <span>•</span>
                              <span className="text-slate-500">{item.category || 'Commodity'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Scan Date (DD/MM/YY) */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-xs text-blue-900 bg-blue-50/80 px-2.5 py-0.5 rounded-md border border-blue-200/70 w-fit">
                            {formatToShortDate(item.timestamp || item.displayDate)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 pl-0.5">
                            {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      </td>

                      {/* Key Statutory Declarations */}
                      <td className="py-4 px-5">
                        <div className="flex flex-col gap-1 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-medium">MRP:</span>
                            <span className={`font-semibold ${mrpVal !== 'Not detected' ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                              {mrpVal}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-medium">Net Qty:</span>
                            <span className={`font-semibold ${netQtyVal !== 'Not detected' ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                              {netQtyVal}
                            </span>
                          </div>
                          {fssaiVal !== 'Not detected' && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400 font-medium">FSSAI:</span>
                              <span className="font-mono text-slate-700">{fssaiVal}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status & Verdict */}
                      <td className="py-4 px-5">
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={item.status} />
                          {item.verdict && (
                            <span className="text-[10px] text-slate-500 font-medium line-clamp-1 max-w-[200px]">
                              {item.verdict}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions & Report Download */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Report Modal */}
                          <button
                            onClick={() => openInspectionReport(item)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                            title="View official inspection report"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>View</span>
                          </button>

                          {/* Download PDF Certificate */}
                          <button
                            onClick={() => downloadInspectionPdf(item)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                            title="Download official PDF report for this item"
                          >
                            <Download className="w-3.5 h-3.5 text-blue-600" />
                            <span>Report PDF</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXPORT OPTIONS MODAL (SELECT DATE: 1 WEEK, 1 MONTH, ALL, CUSTOM)         */}
      {/* ========================================================================= */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shadow-2xs">
                  <FileText className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0B1B2B]">
                    Export Inspection Report
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select the date period for the official statutory compliance report
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsExportModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Step 1: Choose Date Range */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2.5">
                  1. Select Date Range:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: 1 Week */}
                  <div
                    onClick={() => setExportRangeType('WEEK')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      exportRangeType === 'WEEK'
                        ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-bold text-[#0B1B2B]">Past 7 Days (1 Week)</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {dateRangeCounts.week} items
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Exports commodity packages scanned within the last 7 calendar days
                    </p>
                  </div>

                  {/* Option 2: 1 Month */}
                  <div
                    onClick={() => setExportRangeType('MONTH')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      exportRangeType === 'MONTH'
                        ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-bold text-[#0B1B2B]">Past 30 Days (1 Month)</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {dateRangeCounts.month} items
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Exports commodity packages scanned within the last 30 calendar days
                    </p>
                  </div>

                  {/* Option 3: All Time */}
                  <div
                    onClick={() => setExportRangeType('ALL')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      exportRangeType === 'ALL'
                        ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-bold text-[#0B1B2B]">All Time</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                        {dateRangeCounts.all} items
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Complete historical audit archive across all scanned dates
                    </p>
                  </div>

                  {/* Option 4: Custom Range */}
                  <div
                    onClick={() => setExportRangeType('CUSTOM')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      exportRangeType === 'CUSTOM'
                        ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-bold text-[#0B1B2B]">Custom Date Range</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        Select
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Specify custom start and end date limits for targeted audits
                    </p>
                  </div>
                </div>

                {/* Custom Date Inputs if CUSTOM is chosen */}
                {exportRangeType === 'CUSTOM' && (
                  <div className="mt-3.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-3">
                    <div className="w-full sm:flex-1">
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        From Date:
                      </label>
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="w-full sm:flex-1">
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        To Date:
                      </label>
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Selected Items Preview */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#0B1B2B]">
                    Items Included in Export ({exportItems.length})
                  </span>
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                    Period: {exportPeriodLabel}
                  </span>
                </div>

                {exportItems.length === 0 ? (
                  <div className="py-4 text-center text-xs text-rose-600 font-medium bg-rose-50/50 rounded-lg border border-rose-100">
                    No items found matching the selected date range. Please select another period.
                  </div>
                ) : (
                  <div className="max-h-36 overflow-y-auto divide-y divide-slate-200/60 pr-1 text-xs">
                    {exportItems.map((item) => {
                      const prodName = typeof item.productName === 'object' && item.productName !== null
                        ? (item.productName.value || 'Scanned Package')
                        : (item.productName || 'Scanned Package');
                      const dateStr = formatToShortDate(item.timestamp || item.displayDate);

                      return (
                        <div key={item.id} className="py-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono text-[10px] font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-blue-900">
                              {dateStr}
                            </span>
                            <span className="font-medium text-slate-800 truncate max-w-[260px]">
                              {prodName}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.status === 'Compliant'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'Attention Required'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer / Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleExportCsv}
                disabled={exportItems.length === 0}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-200 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export selected items as CSV spreadsheet"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export CSV ({exportItems.length})</span>
              </button>

              <button
                onClick={handleExportPdf}
                disabled={exportItems.length === 0}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Export official PDF dossier report"
              >
                <FileText className="w-4 h-4" />
                <span>Export as PDF ({exportItems.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemsSectionView;
