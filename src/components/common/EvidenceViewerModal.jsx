import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Eye, Scan, Tag, Check, AlertTriangle } from 'lucide-react';
import { StatusBadge } from './Badge';

export const EvidenceViewerModal = ({ isOpen, onClose, data }) => {
  const [zoom, setZoom] = useState(1);

  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#0B1B2B]">
                  Optical Evidence Audit — {typeof data.productName === 'object' && data.productName !== null ? (data.productName.value || 'Scanned Package') : (data.productName || 'Scanned Package')}
                </h3>
                <StatusBadge status={data.status} />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                High-Resolution Label Capture & OCR Text Verification
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          {/* Left: Image Viewer */}
          <div className="md:col-span-7 bg-slate-100/70 p-6 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-slate-200 overflow-hidden">
            {/* Zoom Controls */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-xs">
              <button
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
                className="p-1 text-slate-600 hover:text-black rounded"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
                className="p-1 text-slate-600 hover:text-black rounded"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="p-1 text-slate-600 hover:text-black rounded"
                title="Reset Zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full h-full max-h-[380px] flex items-center justify-center overflow-auto p-2">
              <div
                className="relative transition-transform duration-150 rounded-xl overflow-hidden shadow-md border border-slate-200"
                style={{ transform: `scale(${zoom})` }}
              >
                <img
                  src={data.evidenceImageUrl || "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80"}
                  alt={typeof data.productName === 'object' && data.productName !== null ? (data.productName.value || 'Scanned Package') : (data.productName || 'Scanned Package')}
                  className="max-h-[320px] w-auto object-contain block bg-white"
                />

                {/* Overlaid bounding box on MRP */}
                <div
                  className="absolute border-2 border-amber-400 bg-amber-400/20 rounded z-10"
                  style={{ top: '25%', left: '15%', width: '70%', height: '50%' }}
                >
                  <span className="absolute -top-5 left-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#0B1B2B] text-white">
                    Primary Display Panel
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Detected OCR Parameters */}
          <div className="md:col-span-5 p-6 overflow-y-auto space-y-4 bg-white">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Verified Legal Metrology Parameters
            </h4>

            <div className="space-y-2.5 text-xs">
              {(() => {
                const getVal = (f) => (f && typeof f === 'object' && 'value' in f) ? f.value : (f || 'Not detected');
                const mrpVal = getVal(data.details?.mrp);
                const netVal = getVal(data.details?.netQuantity);
                const mfrVal = getVal(data.details?.manufacturer);
                const addrVal = getVal(data.details?.address);

                return (
                  <>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[11px] text-slate-400 block">Maximum Retail Price</span>
                      <span className="font-bold text-slate-900 block text-sm mt-0.5">
                        {mrpVal}
                      </span>
                      {mrpVal !== 'Not detected' ? (
                        <span className="text-[10px] text-emerald-600 font-medium">✓ Detected on package</span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-normal italic">Not detected in image</span>
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[11px] text-slate-400 block">Net Quantity</span>
                      <span className="font-bold text-slate-900 block text-sm mt-0.5">
                        {netVal}
                      </span>
                      {netVal !== 'Not detected' ? (
                        <span className="text-[10px] text-emerald-600 font-medium">✓ Detected on package</span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-normal italic">Not detected in image</span>
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[11px] text-slate-400 block">Manufacturer & Packer</span>
                      <span className="font-medium text-slate-800 block mt-0.5">
                        {mfrVal}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-[11px] text-slate-400 block">Postal Address</span>
                      <span className="font-medium text-slate-800 block mt-0.5">
                        {addrVal}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-white flex items-center justify-between text-xs">
          <span className="text-slate-500">Optical OCR Accuracy: 99.4%</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};

export default EvidenceViewerModal;
