import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { INITIAL_INSPECTIONS, CONNECTED_DEVICE_DEFAULT, MOCK_SCAN_TEMPLATES } from '../data/mockData';
import socketService from '../services/socketService';
import { formatInspectionFields } from '../utils/inspectionFormatter';
import { generateAiInsights } from '../services/aiInsightsService';
import { getApiUrl } from '../config/api.js';

const InspectionContext = createContext(null);

export const InspectionProvider = ({ children }) => {
  const [inspections, setInspections] = useState(INITIAL_INSPECTIONS);
  const [connectedDevice, setConnectedDevice] = useState(CONNECTED_DEVICE_DEFAULT);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentInterface, setCurrentInterface] = useState('desktop');
  const [systemOnline, setSystemOnline] = useState(true);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [evidenceData, setEvidenceData] = useState(null);

  // Real Session & Pairing state
  const [sessionInfo, setSessionInfo] = useState({
    sessionId: 'LMS-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    mobileUrl: '',
    qrCodeDataUrl: '',
    localIp: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
  });

  // Live scan state for New Inspection screen & Mobile Scanner
  const [liveScanState, setLiveScanState] = useState({
    status: 'idle', // 'idle' | 'capturing' | 'processing' | 'completed'
    progress: 0,
    currentScan: null,
    lastReceivedAt: null,
  });

  // Generate or refresh real session and QR code
  const initializeSession = useCallback(async (forceNew = false) => {
    try {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const vitePort = typeof window !== 'undefined' ? window.location.port || '5173' : '5173';

      // Keep existing session ID unless explicitly forced to generate a new one
      const existingSessionId = !forceNew && typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem('lms_active_session_id')
        : null;

      let newSessionId = existingSessionId || ('LMS-' + Math.random().toString(36).substring(2, 8).toUpperCase());
      let networkIp = host;
      let mobileUrl = `https://${host}:${vitePort}/?sessionId=${newSessionId}&mode=mobile`;

      if (!existingSessionId || forceNew) {
        try {
          const res = await fetch(getApiUrl('/api/session/new'));
          if (res.ok) {
            const data = await res.json();
            newSessionId = data.sessionId;
            if (data.localIp && data.localIp !== 'localhost') {
              networkIp = data.localIp;
            }
            mobileUrl = `https://${networkIp}:${vitePort}/?sessionId=${newSessionId}&mode=mobile`;
          }
        } catch (e) {
          console.warn('[InspectionContext] Could not fetch /api/session/new via proxy, using host:', host, e);
        }
      } else {
        try {
          const res = await fetch(getApiUrl('/api/network-info'));
          if (res.ok) {
            const data = await res.json();
            if (data.localIp && data.localIp !== 'localhost') {
              networkIp = data.localIp;
            }
            mobileUrl = `https://${networkIp}:${vitePort}/?sessionId=${newSessionId}&mode=mobile`;
          }
        } catch (e) {
          console.warn('[InspectionContext] Network info fetch fallback:', e);
        }
      }

      if ((networkIp === 'localhost' || networkIp === '127.0.0.1') && host !== 'localhost') {
        networkIp = host;
        mobileUrl = `https://${networkIp}:${vitePort}/?sessionId=${newSessionId}&mode=mobile`;
      }

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('lms_active_session_id', newSessionId);
      }

      // Generate REAL scannable QR Code Data URL
      const qrDataUrl = await QRCode.toDataURL(mobileUrl, {
        width: 320,
        margin: 1,
        color: {
          dark: '#0B1B2B',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      });

      setSessionInfo({
        sessionId: newSessionId,
        mobileUrl,
        qrCodeDataUrl: qrDataUrl,
        localIp: networkIp,
      });

      // Register session room in Socket.IO
      socketService.init();
      socketService.initSession(newSessionId);
    } catch (err) {
      console.error('[InspectionContext] Failed to generate QR code or initialize session:', err);
    }
  }, []);

  // Handle a newly received scan (from real mobile phone or simulation)
  const handleIncomingScan = useCallback((scanData) => {
    if (!scanData) return;

    const getVal = (f) => (f && typeof f === 'object' && 'value' in f ? f.value : (f || 'Not detected'));
    const safeProdName = (getVal(scanData.productName) && getVal(scanData.productName) !== 'Not detected')
      ? String(getVal(scanData.productName)).trim()
      : 'Scanned Commodity Package';

    const sanitizedScan = {
      ...scanData,
      productName: safeProdName,
      aiInsights: scanData.aiInsights || generateAiInsights(scanData),
    };

    setLiveScanState({
      status: 'completed',
      progress: 100,
      currentScan: sanitizedScan,
      lastReceivedAt: new Date().toLocaleTimeString(),
    });

    // Prepend to inspections list
    setInspections((prev) => {
      const exists = prev.some((item) => item.id === sanitizedScan.id);
      if (exists) return prev;
      return [sanitizedScan, ...prev];
    });
  }, []);

  // Initialize Socket.IO connection and listen for pairing events
  useEffect(() => {
    socketService.init();

    // Check if current page is opened on phone with sessionId from QR code
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlSessionId = urlParams ? urlParams.get('sessionId') : null;

    if (urlSessionId) {
      // THIS IS THE MOBILE PHONE! Join the session room
      const phoneDeviceName = typeof navigator !== 'undefined'
        ? (navigator.userAgent.includes('iPhone')
            ? 'iPhone Field Unit'
            : navigator.userAgent.includes('Android')
            ? 'Android Field Unit'
            : 'Mobile Scanner Unit')
        : 'Mobile Handheld Scanner';

      socketService.joinSession(urlSessionId, {
        name: phoneDeviceName,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      });

      setConnectedDevice((prev) => ({
        ...prev,
        status: 'Connected',
        name: phoneDeviceName,
        lastHeartbeat: 'Connected',
      }));

      // Listen for confirmation from station
      const unsubscribeJoinedSuccess = socketService.on('session:joined_success', () => {
        console.log('[InspectionContext] Phone confirmed paired with station');
        setConnectedDevice((prev) => ({
          ...prev,
          status: 'Connected',
        }));
      });

      const unsubscribeConn = socketService.on('connection:change', (data) => {
        setSystemOnline(data.status.includes('Connected'));
        if (data.status.includes('Connected')) {
          setConnectedDevice((prev) => ({
            ...prev,
            status: 'Connected',
          }));
        }
      });

      return () => {
        unsubscribeJoinedSuccess();
        unsubscribeConn();
      };
    } else {
      // THIS IS THE LAPTOP! Generate session & show QR code
      initializeSession(false);

      // Listen for device connected event (from Phone scanning QR)
      const unsubscribeDeviceConnected = socketService.on('device:connected', (data) => {
        console.log('[InspectionContext] Phone connected to station:', data);
        setConnectedDevice((prev) => ({
          ...prev,
          status: 'Connected',
          name: data.device?.name || 'Mobile Phone Scanner',
          lastHeartbeat: 'Just now',
          latencyMs: Math.floor(Math.random() * 8) + 10,
        }));
      });

      const unsubscribeDeviceDisconnected = socketService.on('device:disconnected', () => {
        console.log('[InspectionContext] Phone disconnected from station');
        setConnectedDevice((prev) => ({
          ...prev,
          status: 'Waiting for device...',
        }));
      });

      // Listen for incoming scan from mobile phone
      const unsubscribeScan = socketService.on('scan:received', (scanData) => {
        console.log('[InspectionContext] Scan received on laptop:', scanData);
        handleIncomingScan(scanData);
      });

      const unsubscribeConn = socketService.on('connection:change', (data) => {
        setSystemOnline(data.status.includes('Connected'));
      });

      return () => {
        unsubscribeDeviceConnected();
        unsubscribeDeviceDisconnected();
        unsubscribeScan();
        unsubscribeConn();
      };
    }
  }, [handleIncomingScan, initializeSession]);

  // Helper to downscale large camera capture images for reliable WebSocket transmission
  const compressImageForSocket = (dataUrl, maxDim = 1000, quality = 0.72) => {
    if (!dataUrl || !dataUrl.startsWith('data:image') || typeof window === 'undefined' || dataUrl.length < 350000) {
      return Promise.resolve(dataUrl);
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // Dispatch scan from mobile scanner interface to laptop
  const submitMobileScan = useCallback((scanPayload) => {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const activeSessionId = (urlParams && urlParams.get('sessionId')) || sessionInfo.sessionId;

    const getVal = (f) => (f && typeof f === 'object' && 'value' in f ? f.value : (f || 'Not detected'));

    const details = scanPayload.details || {
      mrp: 'Not detected',
      netQuantity: 'Not detected',
      manufacturer: 'Not detected',
      address: 'Not detected',
      customerCare: 'Not detected',
      batchNumber: 'Not detected',
      mfgDate: 'Not detected',
      expiryDate: 'Not detected',
      fssaiNumber: 'Not detected',
    };

    const verifications = scanPayload.verifications || [
      { field: 'MRP', value: getVal(details.mrp), found: getVal(details.mrp) !== 'Not detected' },
      { field: 'Net Quantity', value: getVal(details.netQuantity), found: getVal(details.netQuantity) !== 'Not detected' },
      { field: 'Manufacturer', value: getVal(details.manufacturer), found: getVal(details.manufacturer) !== 'Not detected' },
      { field: 'Address', value: getVal(details.address), found: getVal(details.address) !== 'Not detected' },
      { field: 'Customer Care', value: getVal(details.customerCare), found: getVal(details.customerCare) !== 'Not detected' },
    ];

    const formatted = formatInspectionFields(details, scanPayload.ocrRawText);

    const safeProdName = (getVal(scanPayload.productName) && getVal(scanPayload.productName) !== 'Not detected')
      ? String(getVal(scanPayload.productName)).trim()
      : 'Scanned Commodity Package';

    const newScan = {
      id: scanPayload.id || `SCAN-${inspections.length + 1}`,
      timestamp: scanPayload.timestamp || new Date().toISOString(),
      displayDate: scanPayload.displayDate || new Date().toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      productName: safeProdName,
      barcode: scanPayload.barcode || 'N/A',
      category: scanPayload.category || 'Packaged Commodity',
      device: connectedDevice.name,
      status: formatted.allDetected ? 'Compliant' : 'Attention Required',
      verdict: formatted.verdict,
      mandatoryFields: formatted.fields,
      missingFields: formatted.missingFields,
      score: scanPayload.score ?? null,
      ocrRawText: scanPayload.ocrRawText || '',
      ocrConfidence: scanPayload.ocrConfidence || 0,
      details,
      verifications,
      evidenceImageUrl: scanPayload.evidenceImageUrl || '',
      processingTimeMs: scanPayload.processingTimeMs || 0,
      recognitionMode: scanPayload.recognitionMode || 'REAL_OCR',
      recognizedDemoPackage: scanPayload.recognizedDemoPackage || null,
      aiInsights: scanPayload.aiInsights || generateAiInsights({
        ...scanPayload,
        details,
        recognitionMode: scanPayload.recognitionMode || 'REAL_OCR',
        recognizedDemoPackage: scanPayload.recognizedDemoPackage || null,
        ocrConfidence: scanPayload.ocrConfidence || 0,
      }),
    };

    // Save directly to local inspections state
    handleIncomingScan(newScan);

    // Compress thumbnail for smooth Socket.IO transmission over mobile Wi-Fi
    if (newScan.evidenceImageUrl && newScan.evidenceImageUrl.length > 350000) {
      compressImageForSocket(newScan.evidenceImageUrl).then((thumbnailUrl) => {
        socketService.submitScan(activeSessionId, {
          ...newScan,
          evidenceImageUrl: thumbnailUrl,
        });
      }).catch(() => {
        socketService.submitScan(activeSessionId, newScan);
      });
    } else {
      socketService.submitScan(activeSessionId, newScan);
    }

    return newScan;
  }, [connectedDevice.name, handleIncomingScan, inspections.length, sessionInfo.sessionId]);

  const openInspectionReport = (inspection) => {
    setSelectedInspection(inspection);
    setIsReportOpen(true);
  };

  const closeInspectionReport = () => {
    setIsReportOpen(false);
  };

  const openEvidenceModal = (inspectionOrEvidence) => {
    setEvidenceData(inspectionOrEvidence);
    setIsEvidenceOpen(true);
  };

  const closeEvidenceModal = () => {
    setIsEvidenceOpen(false);
    setEvidenceData(null);
  };

  // Re-generate session & QR Code
  const refreshQrCode = () => {
    initializeSession();
  };

  const stats = {
    total: inspections.length,
    compliant: inspections.filter((i) => i.status === 'Compliant').length,
    attention: inspections.filter((i) => i.status === 'Attention Required').length,
    nonCompliant: inspections.filter((i) => i.status === 'Non-Compliant').length,
  };

  const value = {
    inspections,
    stats,
    connectedDevice,
    activeTab,
    setActiveTab,
    currentInterface,
    setCurrentInterface,
    systemOnline,
    setSystemOnline,
    selectedInspection,
    isReportOpen,
    openInspectionReport,
    closeInspectionReport,
    isEvidenceOpen,
    evidenceData,
    openEvidenceModal,
    closeEvidenceModal,
    liveScanState,
    submitMobileScan,
    sessionInfo,
    refreshQrCode,
  };

  return (
    <InspectionContext.Provider value={value}>
      {children}
    </InspectionContext.Provider>
  );
};

export const useInspection = () => {
  const context = useContext(InspectionContext);
  if (!context) {
    throw new Error('useInspection must be used within an InspectionProvider');
  }
  return context;
};
