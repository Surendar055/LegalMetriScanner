import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InspectionProvider, useInspection } from './context/InspectionContext';
import { AuthView } from './views/AuthView';
import { DesktopView } from './views/DesktopView';
import { MobileView } from './views/MobileView';
import { InspectionReportModal } from './components/common/InspectionReportModal';
import { EvidenceViewerModal } from './components/common/EvidenceViewerModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const MainApp = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const {
    currentInterface,
    setCurrentInterface,
    isReportOpen,
    closeInspectionReport,
    selectedInspection,
    isEvidenceOpen,
    closeEvidenceModal,
    evidenceData,
    openEvidenceModal,
  } = useInspection();

  // Automatic mobile device / screen width detection on initial load
  useEffect(() => {
    const isMobileDevice =
      window.innerWidth < 768 ||
      window.location.search.includes('mode=mobile') ||
      window.location.search.includes('scanner') ||
      window.location.hash === '#mobile' ||
      window.location.hash === '#scanner';

    if (isMobileDevice) {
      setCurrentInterface('mobile');
    }
  }, [setCurrentInterface]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-300">Checking Inspector Credentials...</p>
        <p className="text-[10px] text-slate-500 font-mono mt-1">LegalMetriScan Official Portal</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      {/* Main Product Application: Desktop Dashboard or Mobile Interface */}
      <div className="flex-1 flex flex-col">
        {currentInterface === 'mobile' ? <MobileView /> : <DesktopView />}
      </div>

      {/* Global Modals for Official Reports & Optical Evidence */}
      <InspectionReportModal
        isOpen={isReportOpen}
        onClose={closeInspectionReport}
        inspection={selectedInspection}
        onViewEvidence={(insp) => openEvidenceModal(insp)}
      />

      <EvidenceViewerModal
        isOpen={isEvidenceOpen}
        onClose={closeEvidenceModal}
        data={evidenceData}
      />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <InspectionProvider>
          <MainApp />
        </InspectionProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
