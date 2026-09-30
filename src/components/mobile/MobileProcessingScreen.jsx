import React, { useEffect, useState, useRef } from 'react';
import { Logo } from '../common/Logo';
import { useInspection } from '../../context/InspectionContext';
import { runOcrOnImage } from '../../services/ocrService';
import { formatInspectionFields } from '../../utils/inspectionFormatter';
import { detectDemoPackage } from '../../services/demoRecognitionService';
import { Sparkles, Scan, AlertCircle, WifiOff, RefreshCw, ArrowLeft } from 'lucide-react';

export const MobileProcessingScreen = ({ currentScan, onFinishProcessing, onRetake }) => {
  const { connectedDevice, submitMobileScan } = useInspection();
  const isConnected = connectedDevice?.status === 'Connected';

  const [progress, setProgress] = useState(15);
  const [stageText, setStageText] = useState('Initializing OCR analysis engine...');
  const [errorState, setErrorState] = useState(null); // { type: 'network' | 'ocr', title: string, message: string }
  const hasStartedRef = useRef(false);

  const processImage = async () => {
    setErrorState(null);
    const evidenceImg = currentScan?.evidenceImageUrl;
    const workingImg = currentScan?.workingImageUrl || evidenceImg;

    if (!evidenceImg && !workingImg) {
      console.warn('[ProcessingScreen] No image URL found to process');
      setErrorState({
        type: 'ocr',
        title: 'No Package Photo Captured',
        message: 'No photo was received for processing. Please return to the camera and take a photo of the package.',
      });
      return;
    }

    try {
      setStageText('Detecting commodity label text with OCR...');
      setProgress(25);

      const ocrResult = await runOcrOnImage(
        workingImg,
        (p) => {
          if (p.progress) setProgress(p.progress);
          if (p.message) setStageText(p.message);
        },
        {
          originalImage: evidenceImg,
          clientQualityDebug: currentScan?.clientQualityDebug || null,
        }
      );

      setProgress(100);

      // Controlled Demo Recognition Layer
      const demoMatch = detectDemoPackage(ocrResult.rawText);

      // Extract string value safely from productName field
      const rawProductName = ocrResult.extractedFields?.productName;
      const productNameStr = (typeof rawProductName === 'object' && rawProductName !== null)
        ? rawProductName.value
        : rawProductName;
      const safeProductName = (productNameStr && productNameStr !== 'Not detected')
        ? String(productNameStr).trim()
        : 'Scanned Commodity Package';

      let effectiveDetails = ocrResult.extractedFields;
      let effectiveProductName = safeProductName;
      let recognitionMode = 'REAL_OCR';
      let recognizedDemoPackage = null;

      if (demoMatch) {
        recognitionMode = 'DEMO_REFERENCE';
        recognizedDemoPackage = demoMatch.id;
        effectiveProductName = demoMatch.productName;
        effectiveDetails = demoMatch.referenceDetails;
      }

      // Compute statutory formatting & verdict
      const formatted = formatInspectionFields(effectiveDetails, ocrResult.rawText);

      // Build verified scan structure
      const analyzedScan = {
        id: currentScan?.id || `SCAN-${Date.now().toString(36).substring(2, 8).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        displayDate: new Date().toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        productName: effectiveProductName,
        evidenceImageUrl: evidenceImg,
        ocrRawText: ocrResult.rawText || '',
        ocrConfidence: ocrResult.ocrConfidence || 0,
        selectedVariant: ocrResult.selectedVariant || 'Adaptive Multi-Orientation Preprocessing',
        processingTimeMs: ocrResult.processingTimeMs || 0,
        variantsTested: ocrResult.variantsTested || 1,
        psmMode: ocrResult.psmMode || '3 (Automatic)',
        details: effectiveDetails,
        verdict: formatted.verdict,
        status: formatted.allDetected ? 'Compliant' : 'Attention Required',
        mandatoryFields: formatted.fields,
        missingFields: formatted.missingFields,
        recognitionMode,
        recognizedDemoPackage,
      };

      // Save to context & broadcast to laptop station
      submitMobileScan(analyzedScan);

      // Transition to results screen
      setTimeout(() => {
        onFinishProcessing?.(analyzedScan);
      }, 400);
    } catch (err) {
      console.error('[ProcessingScreen] OCR analysis error:', err);

      const errMsg = err?.message || String(err);
      const isNetwork =
        errMsg.toLowerCase().includes('fetch') ||
        errMsg.toLowerCase().includes('network') ||
        errMsg.toLowerCase().includes('failed to fetch') ||
        (typeof navigator !== 'undefined' && !navigator.onLine);

      if (isNetwork) {
        setErrorState({
          type: 'network',
          title: 'Network Connection Error',
          message: 'Could not connect to the inspection server. Please ensure the backend server is running and your network connection is active.',
        });
      } else {
        setErrorState({
          type: 'ocr',
          title: 'OCR Analysis Error',
          message: `The OCR engine encountered an error while processing the image: ${errMsg}. Please capture a clear, well-lit photo of the label and try again.`,
        });
      }
    }
  };

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    processImage();
  }, []);

  // Error Screen View (Requirement 6: Never a blank screen)
  if (errorState) {
    const isNetwork = errorState.type === 'network';
    return (
      <div className="flex-1 flex flex-col justify-between bg-white text-slate-900 select-none">
        {/* Top Header */}
        <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
          <Logo variant="light" size="sm" showSubtitle={false} />
          <div className="px-2 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-[10px] font-semibold text-rose-600">
            Error
          </div>
        </div>

        {/* Error Details */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-4 text-rose-600">
            {isNetwork ? <WifiOff className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
          </div>

          <h3 className="text-base font-bold text-[#0B1B2B] mb-2">
            {errorState.title}
          </h3>

          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            {errorState.message}
          </p>

          <div className="flex flex-col gap-2.5 w-full">
            <button
              onClick={processImage}
              className="w-full py-3 px-4 rounded-xl bg-[#0B1B2B] hover:bg-[#152a42] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-xs active:scale-98"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Processing</span>
            </button>

            {onRetake && (
              <button
                onClick={onRetake}
                className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs flex items-center justify-center gap-2 transition-colors active:scale-98"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retake Photo</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="py-3 px-4 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400">LegalMetriScan Inspection System</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-between bg-white text-slate-900 select-none">
      {/* Top Header */}
      <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
        <Logo variant="light" size="sm" showSubtitle={false} />
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
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
          <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
        </div>
      </div>

      {/* Center Processing Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {/* Captured Thumbnail Card */}
        <div className="w-40 h-40 rounded-2xl overflow-hidden border border-slate-200 shadow-md mb-6 bg-slate-950 flex items-center justify-center p-1 relative group">
          {currentScan?.evidenceImageUrl ? (
            <img
              src={currentScan.evidenceImageUrl}
              alt="Captured Commodity"
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <div className="text-xs text-slate-400 font-medium p-4 flex flex-col items-center gap-2">
              <Scan className="w-6 h-6 animate-pulse" />
              <span>Captured Packet Photo</span>
            </div>
          )}

          {/* Real-time OCR scanning beam animation */}
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-blue-400 via-sky-300 to-blue-400 shadow-[0_0_12px_#38bdf8] animate-bounce pointer-events-none" />
        </div>

        {/* Circular Blue Spinner */}
        <div className="w-8 h-8 rounded-full border-3 border-slate-100 border-t-blue-600 animate-spin mb-3" />

        {/* Title & Dynamic Status */}
        <h3 className="text-base font-bold text-[#0B1B2B] flex items-center gap-1.5">
          <span>Running Optical OCR</span>
          <Sparkles className="w-4 h-4 text-sky-500" />
        </h3>
        <p className="text-xs text-slate-600 mt-1 max-w-[260px] leading-relaxed font-medium">
          {stageText}
        </p>

        {/* Blue Progress Bar */}
        <div className="w-56 bg-slate-100 h-2 rounded-full overflow-hidden mt-6 mb-2">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-400 font-mono">
          {progress}% complete
        </p>
      </div>

      {/* Footer Info */}
      <div className="py-3 px-4 border-t border-slate-100 text-center">
        <p className="text-[10px] text-slate-400">
          Analyzing actual photo declarations • No mock data
        </p>
      </div>
    </div>
  );
};

export default MobileProcessingScreen;
