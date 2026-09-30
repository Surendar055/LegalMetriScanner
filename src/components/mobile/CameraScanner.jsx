import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Flashlight, AlertCircle, RefreshCw, Image, ShieldAlert, Sparkles, CheckCircle2, Upload } from 'lucide-react';
import { Logo } from '../common/Logo';
import { MOCK_SCAN_TEMPLATES } from '../../data/mockData';
import { useInspection } from '../../context/InspectionContext';
import {
  evaluateLiveVideoQuality,
  captureBurstFrames,
  evaluateConservativeCrop,
  generateOcrWorkingImage,
  calculateSharpness,
  calculateBrightness,
} from '../../utils/cameraQuality';

export const CameraScanner = ({ onCapture, isProcessing }) => {
  const { connectedDevice } = useInspection();
  const isConnected = connectedDevice?.status === 'Connected';

  const [cameraState, setCameraState] = useState('starting'); // 'starting' | 'active' | 'denied' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [isCapturingBurst, setIsCapturingBurst] = useState(false);

  // Live quality monitoring state
  const [liveQuality, setLiveQuality] = useState({
    sharpness: 0,
    brightness: 128,
    isBlurry: false,
    statusText: 'Move closer until the package fills the frame',
    canCapture: true,
  });

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const sampleCanvasRef = useRef(null);
  const qualityIntervalRef = useRef(null);

  // Stop active media stream tracks
  const stopCamera = useCallback(() => {
    if (qualityIntervalRef.current) {
      clearInterval(qualityIntervalRef.current);
      qualityIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping camera track:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Request back camera immediately
  const startCamera = useCallback(async () => {
    setCameraState('starting');
    setErrorMessage('');
    setErrorDetails('');

    // Ensure any existing stream is cleaned up
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('error');
      setErrorMessage('Camera API is unavailable in this browser environment.');
      setErrorDetails(
        'navigator.mediaDevices.getUserMedia is undefined. Note: Mobile camera access strictly requires a secure context (HTTPS) or localhost.'
      );
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video auto-play warning:', playErr);
        }
      }

      setCameraState('active');

      // Start periodic lightweight quality evaluation (~250ms interval)
      if (qualityIntervalRef.current) clearInterval(qualityIntervalRef.current);
      qualityIntervalRef.current = setInterval(() => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          if (!sampleCanvasRef.current) {
            sampleCanvasRef.current = document.createElement('canvas');
          }
          const q = evaluateLiveVideoQuality(videoRef.current, sampleCanvasRef.current);
          setLiveQuality((prev) => ({
            sharpness: q.sharpness,
            brightness: q.brightness,
            isBlurry: q.isBlurry,
            statusText: q.statusText,
            canCapture: q.canCapture,
          }));
        }
      }, 250);
    } catch (err) {
      console.error('Camera access error:', err);

      const isPermissionDenied =
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError' ||
        (err.message && err.message.toLowerCase().includes('denied'));

      if (isPermissionDenied) {
        setCameraState('denied');
        setErrorMessage('Camera permission is required');
        setErrorDetails(err.message || 'Permission was denied by the user or browser.');
      } else {
        setCameraState('error');
        setErrorMessage(err.name ? `${err.name}: ${err.message}` : 'Failed to access camera');
        setErrorDetails(err.stack || err.message || String(err));
      }
    }
  }, [stopCamera]);

  // Immediately start camera on component mount
  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Re-attach stream to video element when ready if needed
  useEffect(() => {
    if (
      cameraState === 'active' &&
      videoRef.current &&
      streamRef.current &&
      videoRef.current.srcObject !== streamRef.current
    ) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraState]);

  // Toggle torch / flash if supported by hardware track
  const toggleTorch = async () => {
    const nextState = !torchOn;
    const track = streamRef.current?.getVideoTracks()[0];

    if (track && typeof track.applyConstraints === 'function') {
      try {
        await track.applyConstraints({
          advanced: [{ torch: nextState }],
        });
      } catch (err) {
        console.warn('Hardware torch toggle not supported:', err);
      }
    }

    setTorchOn(nextState);
  };

  // Handle capture shutter click with 3-frame burst + best frame selection
  const handleShutterClick = async () => {
    if (isProcessing || isCapturingBurst) return;

    if (!videoRef.current) {
      console.warn('No video element available for capture');
      return;
    }

    try {
      setIsCapturingBurst(true);

      // Phase 4: Capture 3 frames rapidly and select best frame based on sharpness
      const { bestFrame, allFrames } = await captureBurstFrames(videoRef.current, 3, 65);

      // Evaluate conservative package crop (safely preserves full edges)
      const { canvas: cropCanvas, cropApplied } = evaluateConservativeCrop(bestFrame.canvas);

      // Generate 2x working image for OCR while preserving original for legal evidence
      const { workingImageUrl, upscaleApplied, ocrDimensions } = generateOcrWorkingImage(cropCanvas);

      const clientQualityDebug = {
        selectedFrame: bestFrame.index,
        sharpness: bestFrame.sharpness,
        brightness: bestFrame.brightness,
        original: `${bestFrame.width}x${bestFrame.height}`,
        ocrImage: ocrDimensions,
        cropApplied,
        upscaleApplied,
        burstMetrics: allFrames,
      };

      console.log('[Camera Quality Burst]', clientQualityDebug);

      // Transmit both evidence original and working image with quality debug metadata
      onCapture?.({
        evidenceImageUrl: bestFrame.dataUrl, // Original captured frame as immutable evidence
        workingImageUrl,                     // 2x upscaled working image for OCR
        clientQualityDebug,
      });
    } catch (err) {
      console.error('Error during burst capture:', err);
    } finally {
      setIsCapturingBurst(false);
    }
  };

  // Gallery file picker handlers
  const handleGalleryClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // Evaluate quality
          const evalCanvas = document.createElement('canvas');
          evalCanvas.width = 320;
          evalCanvas.height = Math.round((img.height / img.width) * 320);
          const evalCtx = evalCanvas.getContext('2d');
          evalCtx.drawImage(canvas, 0, 0, evalCanvas.width, evalCanvas.height);
          const evalData = evalCtx.getImageData(0, 0, evalCanvas.width, evalCanvas.height);

          const sharpness = calculateSharpness(evalData);
          const brightness = calculateBrightness(evalData);

          const { canvas: cropCanvas, cropApplied } = evaluateConservativeCrop(canvas);
          const { workingImageUrl, upscaleApplied, ocrDimensions } = generateOcrWorkingImage(cropCanvas);

          const clientQualityDebug = {
            selectedFrame: 1,
            sharpness,
            brightness,
            original: `${img.width}x${img.height}`,
            ocrImage: ocrDimensions,
            cropApplied,
            upscaleApplied,
          };

          onCapture?.({
            evidenceImageUrl: dataUrl,
            workingImageUrl,
            clientQualityDebug,
          });
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex-1 flex flex-col justify-between relative bg-black select-none overflow-hidden">
      {/* Hidden File Input for Gallery Button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Header */}
      <div className="px-4 py-3 bg-[#0B1B2B] flex items-center justify-between z-20 border-b border-slate-800">
        <Logo variant="dark" size="sm" showSubtitle={false} />

        <div className="flex items-center gap-2">
          {/* Torch toggle */}
          <button
            onClick={toggleTorch}
            className={`p-2 rounded-full border transition-colors backdrop-blur ${
              torchOn
                ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                : 'bg-black/60 text-white/80 border-white/20 hover:text-white'
            }`}
            title="Toggle Flash / Torch"
          >
            <Flashlight className="w-3.5 h-3.5" />
          </button>

          {/* Connection status badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold transition-colors ${
            isConnected
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
            <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
          </div>
        </div>
      </div>

      {/* Main Viewport Area: REAL DEVICE CAMERA ONLY */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-slate-950">
        {/* Real Live Video Feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            cameraState === 'active' ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Torch flash simulation overlay */}
        {torchOn && (
          <div className="absolute inset-0 bg-amber-100/10 mix-blend-overlay pointer-events-none z-10" />
        )}

        {/* Camera Starting Spinner */}
        {cameraState === 'starting' && (
          <div className="absolute inset-0 z-20 bg-slate-950 flex flex-col items-center justify-center text-center p-6">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mb-3" />
            <span className="text-sm font-semibold text-white">Opening Phone Camera...</span>
            <span className="text-xs text-slate-400 mt-1">Requesting high-resolution back camera</span>
          </div>
        )}

        {/* Camera Permission Denied or Failed View */}
        {(cameraState === 'denied' || cameraState === 'error') && (
          <div className="absolute inset-0 z-30 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4 text-rose-400">
              <AlertCircle className="w-7 h-7" />
            </div>

            <h3 className="text-base font-bold text-white mb-2">
              {cameraState === 'denied' ? 'Camera Permission Denied' : 'Camera Unavailable'}
            </h3>

            <p className="text-xs text-slate-300 max-w-xs mb-5 leading-relaxed">
              {cameraState === 'denied'
                ? 'Camera access was denied. Please allow camera permissions in your browser address bar settings to scan packaged commodities.'
                : 'Unable to start camera. Please ensure no other application is using the camera and try again, or upload an image.'}
            </p>

            <div className="flex flex-col gap-2.5 w-full max-w-xs mb-4">
              <button
                onClick={startCamera}
                className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-400/20 active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Camera</span>
              </button>

              <button
                onClick={handleGalleryClick}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-slate-700 active:scale-95"
              >
                <Upload className="w-4 h-4 text-slate-300" />
                <span>Upload Package Photo</span>
              </button>
            </div>

            {errorMessage && (
              <p className="text-[11px] text-slate-400 max-w-xs">
                Note: {errorMessage}
              </p>
            )}
          </div>
        )}

        {/* Package Framing Guide & Quality Overlay (Shown when camera is active) */}
        {cameraState !== 'denied' && cameraState !== 'error' && (
          <>
            {/* Subtle Package Framing Guide: Encourages filling ~82% of frame without clipping edges */}
            <div className="absolute inset-x-6 inset-y-12 sm:inset-x-10 sm:inset-y-16 pointer-events-none z-10 flex flex-col justify-between items-center border border-dashed border-amber-400/30 rounded-2xl p-3">
              {/* Corner Guides (Top-Left, Top-Right, Bottom-Left, Bottom-Right) */}
              <div className="w-full flex justify-between items-start">
                <div className="w-7 h-7 border-t-4 border-l-4 border-amber-400 rounded-tl-xl shadow-[0_0_8px_rgba(251,191,36,0.3)]" />
                <div className="w-7 h-7 border-t-4 border-r-4 border-amber-400 rounded-tr-xl shadow-[0_0_8px_rgba(251,191,36,0.3)]" />
              </div>

              {/* Animated Laser Scanning Beam */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400/80 to-transparent shadow-[0_0_12px_#fbbf24] animate-[bounce_2.8s_infinite]" />

              <div className="w-full flex justify-between items-end">
                <div className="w-7 h-7 border-b-4 border-l-4 border-amber-400 rounded-bl-xl shadow-[0_0_8px_rgba(251,191,36,0.3)]" />
                <div className="w-7 h-7 border-b-4 border-r-4 border-amber-400 rounded-br-xl shadow-[0_0_8px_rgba(251,191,36,0.3)]" />
              </div>

              {/* Safety Margin Legend */}
              <div className="absolute bottom-2 px-3 py-1 rounded-full bg-black/60 border border-white/10 text-[9px] font-mono text-amber-200/80 backdrop-blur">
                FILL FRAME • KEEP ALL LABELS VISIBLE
              </div>
            </div>

            {/* Quality / Guidance Feedback Pill */}
            <div className="absolute bottom-5 inset-x-4 z-20 flex justify-center pointer-events-none transition-all">
              <div
                className={`px-4 py-2 rounded-full border text-xs font-medium flex items-center gap-2 backdrop-blur-md shadow-lg transition-colors ${
                  liveQuality.isBlurry
                    ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                    : 'bg-black/80 border-amber-400/30 text-white'
                }`}
              >
                {liveQuality.isBlurry ? (
                  <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                <span>
                  {liveQuality.isBlurry
                    ? 'Hold steady — text is not sharp enough'
                    : 'Move closer until the package fills the frame'}
                </span>
                {liveQuality.sharpness > 0 && (
                  <span className="text-[10px] font-mono opacity-60 ml-1">
                    ({Math.round(liveQuality.sharpness)})
                  </span>
                )}
              </div>
            </div>

            {/* Burst Capture Progress Overlay */}
            {isCapturingBurst && (
              <div className="absolute inset-0 z-30 bg-black/75 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
                <div className="w-12 h-12 rounded-full border-4 border-amber-400 border-t-transparent animate-spin mb-4" />
                <h4 className="text-white font-bold text-sm mb-1">Capturing Rapid 3-Frame Burst...</h4>
                <p className="text-amber-200 text-xs font-mono">Selecting sharpest frame & upscaling 2× for OCR</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Shutter Controls */}
      <div className="px-8 py-5 bg-[#0B1B2B] flex items-center justify-between z-20 border-t border-slate-800">
        {/* Gallery / Import Photo Button */}
        <button
          onClick={handleGalleryClick}
          className="p-3 rounded-xl bg-slate-800/80 text-white hover:bg-slate-700 transition-colors border border-white/10 active:scale-95"
          title="Import Photo from Gallery"
        >
          <Image className="w-5 h-5" />
        </button>

        {/* Big Circular White Shutter Button */}
        <button
          onClick={handleShutterClick}
          disabled={isProcessing || isCapturingBurst || cameraState === 'denied'}
          className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-1 active:scale-90 transition-transform shadow-xl shadow-black/50 disabled:opacity-40"
          title="Capture Package"
        >
          <div className="w-full h-full bg-white rounded-full transition-transform active:scale-95" />
        </button>

        {/* Symmetrical Torch / Secondary Button */}
        <button
          onClick={toggleTorch}
          className={`p-3 rounded-xl border transition-colors active:scale-95 ${
            torchOn
              ? 'bg-amber-400 text-slate-950 border-amber-300'
              : 'bg-slate-800/80 text-white hover:bg-slate-700 border-white/10'
          }`}
          title="Toggle Torch"
        >
          <Flashlight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default CameraScanner;