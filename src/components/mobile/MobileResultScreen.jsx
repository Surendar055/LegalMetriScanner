import React from 'react';
import {
  Tag,
  Scale,
  Building,
  Phone,
  Check,
  X,
  Calendar,
  Layers,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { useInspection } from '../../context/InspectionContext';
import { formatInspectionFields } from '../../utils/inspectionFormatter';
import { AiInsightsCard } from '../common/AiInsightsCard';

export const MobileResultScreen = ({ currentScan, onViewEvidence, onScanAnother }) => {
  const { connectedDevice } = useInspection();
  const isConnected = connectedDevice?.status === 'Connected';

  const details = currentScan?.details || {};
  const rawText = currentScan?.ocrRawText || '';
  const ocrConfidence = currentScan?.ocrConfidence || 0;

  // Use authoritative formatter with Net Quantity rule & mandatory statutory fields
  const formatted = formatInspectionFields(details, rawText);

  // Field icons mapping
  const fieldIcons = {
    fssai: { icon: ShieldCheck, color: 'bg-cyan-50 text-cyan-600' },
    mrp: { icon: Tag, color: 'bg-blue-50 text-blue-600' },
    netQuantity: { icon: Scale, color: 'bg-emerald-50 text-emerald-600' },
    batch: { icon: Layers, color: 'bg-amber-50 text-amber-600' },
    mfd: { icon: Calendar, color: 'bg-indigo-50 text-indigo-600' },
    bestBefore: { icon: Calendar, color: 'bg-orange-50 text-orange-600' },
    manufacturer: { icon: Building, color: 'bg-purple-50 text-purple-600' },
    customerCare: { icon: Phone, color: 'bg-teal-50 text-teal-600' },
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-white text-slate-900 select-none overflow-y-auto">
      {/* Top Header */}
      <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
        <Logo variant="light" size="sm" showSubtitle={false} />
        <div
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${
            isConnected
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
              : 'bg-amber-50 text-amber-600 border-amber-200'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
            }`}
          ></span>
          <span>{isConnected ? 'Station Linked' : 'Standalone'}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Real Live Captured Photo Preview Card */}
        {currentScan?.evidenceImageUrl && (
          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-xs relative bg-slate-950">
            <img
              src={currentScan.evidenceImageUrl}
              alt="Captured Commodity Package"
              className="w-full h-44 object-cover"
            />
            <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur border border-white/20 text-[10px] font-mono font-semibold text-emerald-400">
              CAPTURED PACKAGE
            </div>
            {ocrConfidence > 0 && (
              <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur border border-white/20 text-[10px] font-mono font-semibold text-sky-400">
                OCR {ocrConfidence}%
              </div>
            )}
          </div>
        )}

        {/* Product Title & Detection Status Count */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
              {currentScan?.recognitionMode === 'DEMO_REFERENCE' ? (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Verified Commodity Profile
                </span>
              ) : (
                'Statutory Inspection Result'
              )}
            </span>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                formatted.allDetected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {formatted.detectedCount} / {formatted.totalCount} Detected
            </span>
          </div>
          <h2 className="text-base font-extrabold text-[#0B1B2B] leading-tight">
            {currentScan?.productName || 'Scanned Commodity Package'}
          </h2>
          <p className="text-xs text-slate-500">
            Packaged commodity statutory audit under Legal Metrology (Packaged Commodities) Rules, 2011.
          </p>
        </div>

        {/* Overall Verdict Banner */}
        {formatted.allDetected ? (
          <div className="bg-emerald-50 border border-emerald-200/90 rounded-xl p-3.5 flex items-start gap-3">
            <div className="p-1 rounded-full bg-emerald-100 text-emerald-600 shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-900 block">
                All mandatory fields detected
              </span>
              <p className="text-[11px] text-emerald-700 mt-0.5 leading-snug">
                All 8 statutory packaged commodity declarations were successfully identified on the label.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-3.5 flex items-start gap-3">
            <div className="p-1 rounded-full bg-amber-100 text-amber-600 shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4 text-amber-600 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-900 block">
                {formatted.missingFields.length} {formatted.missingFields.length === 1 ? 'field' : 'fields'} missing / potential issue
              </span>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-snug font-medium">
                Missing: <span className="font-semibold">{formatted.missingFields.join(', ')}</span>
              </p>
            </div>
          </div>
        )}

        {/* AI Inspection Insights Card */}
        <AiInsightsCard scanData={currentScan} />

        {/* Declarations Extraction Checklist Card */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
          <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Mandatory Declarations (PCR Rule 6)
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Status & Value</span>
          </div>

          {formatted.fields.map((f) => {
            const iconConfig = fieldIcons[f.key] || { icon: Tag, color: 'bg-slate-100 text-slate-600' };
            const Icon = iconConfig.icon;

            return (
              <div
                key={f.key}
                className="py-3 px-3.5 flex items-start justify-between text-xs hover:bg-slate-50/50 transition-colors gap-3"
              >
                {/* Field Icon & Label */}
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconConfig.color}`}>
                    <Icon className="w-3.5 h-3.5 stroke-[2]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] text-slate-500 font-medium block leading-tight">
                      {f.name}
                    </span>
                    {/* Extracted Value */}
                    <span
                      className={`text-xs font-bold block leading-snug mt-1 break-words ${
                        f.detected ? 'text-[#0B1B2B]' : 'text-slate-400 font-normal italic'
                      }`}
                    >
                      {f.value}
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="shrink-0 pt-0.5 flex flex-col items-end">
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
            );
          })}
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="p-4 border-t border-slate-100 bg-white grid grid-cols-2 gap-3 sticky bottom-0 z-20">
        <button
          onClick={onViewEvidence}
          className="py-3 px-4 rounded-xl bg-[#0B1B2B] hover:bg-[#152a42] text-white text-xs font-semibold transition-colors shadow-xs active:scale-98 text-center"
        >
          View Evidence
        </button>

        <button
          onClick={onScanAnother}
          className="py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors active:scale-98 text-center"
        >
          Scan Another
        </button>
      </div>
    </div>
  );
};

export default MobileResultScreen;
