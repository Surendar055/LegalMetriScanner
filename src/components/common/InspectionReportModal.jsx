import {
  X,
  Printer,
  FileText,
  CheckCircle2,
  AlertCircle,
  Check,
  Stamp,
  Download,
} from 'lucide-react';
import { StatusBadge } from './Badge';
import { formatInspectionFields } from '../../utils/inspectionFormatter';
import { downloadInspectionPdf } from '../../utils/reportGenerator';

export const InspectionReportModal = ({ isOpen, onClose, inspection, onViewEvidence }) => {
  if (!isOpen || !inspection) return null;

  const d = inspection.details || {};
  const rawText = inspection.ocrRawText || '';
  const formatted = formatInspectionFields(d, rawText);

  const handlePrint = () => {
    window.print();
  };

  const displayStatus = inspection.status || (formatted.allDetected ? 'Compliant' : 'Attention Required');
  const verdict = inspection.verdict || formatted.verdict;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2 text-slate-800">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-sm text-[#0B1B2B]">
              Inspection Verification Report
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              #{inspection.id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadInspectionPdf(inspection)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Download official PDF report for this item"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Paper Body */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-6 bg-slate-50/50">
          {/* Header Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <Stamp className="w-6 h-6 stroke-[2]" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  Legal Metrology Verification
                </span>
                <h3 className="text-base font-bold text-[#0B1B2B]">
                  {typeof inspection.productName === 'object' && inspection.productName !== null
                    ? (inspection.productName.value || 'Scanned Commodity Package')
                    : (inspection.productName || 'Scanned Commodity Package')}
                </h3>
                <p className="text-xs text-slate-500">
                  {inspection.displayDate || new Date(inspection.timestamp).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div>
              <StatusBadge status={displayStatus} />
            </div>
          </div>

          {/* Verdict Banner */}
          {formatted.allDetected ? (
            <div className="bg-emerald-50 border border-emerald-200/90 rounded-xl p-4 flex items-start gap-3">
              <div className="p-1 rounded-full bg-emerald-100 text-emerald-600 shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-sm font-bold text-emerald-900 block">
                  All mandatory fields detected
                </span>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Package contains all mandatory declarations prescribed under Rule 6 of Legal Metrology (Packaged Commodities) Rules, 2011.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-4 flex items-start gap-3">
              <div className="p-1 rounded-full bg-amber-100 text-amber-600 shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5 text-amber-600 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-sm font-bold text-amber-900 block">
                  {verdict}
                </span>
                <p className="text-xs text-amber-800 mt-0.5 font-medium">
                  Missing declarations: {formatted.missingFields.join(', ')}
                </p>
              </div>
            </div>
          )}

          {/* Mandatory Declarations Table (Exact 8 Fields) */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Mandatory Declarations Audit (PCR 2011 Rule 6)
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {formatted.detectedCount} of {formatted.totalCount} Detected
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {formatted.fields.map((f) => (
                <div key={f.key} className="p-3.5 px-5 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-slate-500 font-medium block leading-tight">{f.name}</span>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <span className={`font-semibold ${f.detected ? 'text-[#0B1B2B]' : 'text-slate-400 font-normal italic'}`}>
                      {f.value}
                    </span>
                    {f.detected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        <span>Detected</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                        <X className="w-2.5 h-2.5 stroke-[2.5]" />
                        <span>Not detected</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Package Evidence Thumbnail if available */}
          {inspection.evidenceImageUrl && (
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-xs font-bold text-slate-700 block mb-2">
                Captured Package Evidence (Original Frame)
              </span>
              <div className="h-44 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center">
                <img
                  src={inspection.evidenceImageUrl}
                  alt={inspection.productName}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InspectionReportModal;
