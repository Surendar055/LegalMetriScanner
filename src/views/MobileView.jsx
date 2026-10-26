import React, { useState } from 'react';
import { MobileWelcomeScreen } from '../components/mobile/MobileWelcomeScreen';
import { CameraScanner } from '../components/mobile/CameraScanner';
import { MobileProcessingScreen } from '../components/mobile/MobileProcessingScreen';
import { MobileResultScreen } from '../components/mobile/MobileResultScreen';
import { MobileSuccessScreen } from '../components/mobile/MobileSuccessScreen';
import { EvidenceViewerModal } from '../components/common/EvidenceViewerModal';
import { INITIAL_INSPECTIONS } from '../data/mockData';
import { useInspection } from '../context/InspectionContext';

export const MobileView = ({
  isEmbedded = false,
  forcedStep = null,
}) => {
  const { setCurrentInterface, submitMobileScan } = useInspection();
  const [currentStep, setCurrentStep] = useState(forcedStep || 'welcome');
  const [currentScan, setCurrentScan] = useState(null);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);

  const step = forcedStep || currentStep;

  const handleCapturePackage = (capturedScan) => {
    // Store original captured image as evidence and working image for OCR
    const payload = {
      evidenceImageUrl: capturedScan?.evidenceImageUrl || '',
      workingImageUrl: capturedScan?.workingImageUrl || capturedScan?.evidenceImageUrl || '',
      clientQualityDebug: capturedScan?.clientQualityDebug || null,
      isProcessing: true,
    };

    setCurrentScan(payload);
    setCurrentStep('processing');
  };

  // Phone inner content
  const renderScreenContent = () => {
    switch (step) {
      case 'welcome':
        return (
          <MobileWelcomeScreen
            onGetStarted={() => setCurrentStep('camera')}
          />
        );

      case 'camera':
        return (
          <CameraScanner
            onCapture={handleCapturePackage}
          />
        );

      case 'processing':
        return (
          <MobileProcessingScreen
            currentScan={currentScan}
            onRetake={() => setCurrentStep('camera')}
            onFinishProcessing={(analyzedResult) => {
              if (analyzedResult) {
                setCurrentScan(analyzedResult);
              }
              setCurrentStep('result');
            }}
          />
        );

      case 'result':
        return (
          <MobileResultScreen
            currentScan={currentScan}
            onViewEvidence={() => setIsEvidenceOpen(true)}
            onScanAnother={() => {
              setCurrentScan(null);
              setCurrentStep('camera');
            }}
          />
        );

      case 'success':
        return (
          <MobileSuccessScreen
            onBackToHome={() => setCurrentStep('welcome')}
          />
        );

      default:
        return (
          <MobileWelcomeScreen
            onGetStarted={() => setCurrentStep('camera')}
          />
        );
    }
  };

  const sampleEvidence = INITIAL_INSPECTIONS[0];

  return (
    <div className={`w-full flex justify-center bg-slate-100 ${isEmbedded ? 'h-full' : 'min-h-screen'}`}>
      <div
        className={`w-full ${
          isEmbedded
            ? 'h-full bg-white flex flex-col'
            : 'max-w-md min-h-screen bg-white border-x border-slate-200/80 shadow-lg flex flex-col relative'
        }`}
      >
        {/* Render Active Mobile Screen */}
        <div className="flex-1 flex flex-col min-h-0 bg-white relative">
          {renderScreenContent()}
        </div>

        {/* Modal for Evidence */}
        <EvidenceViewerModal
          isOpen={isEvidenceOpen}
          onClose={() => setIsEvidenceOpen(false)}
          data={currentScan || sampleEvidence}
        />
      </div>
    </div>
  );
};

export default MobileView;
