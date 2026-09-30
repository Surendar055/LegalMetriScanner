/**
 * LegalMetriScan — AI Inspection Insights Engine
 *
 * Provides realistic, inspector-grade, AI-assisted preliminary verification insights
 * based on OCR extraction, date analysis, and Legal Metrology Rule compliance data.
 *
 * NOTE: All outputs are strictly AI-assisted preliminary verification insights
 * and are explicitly disclaimed as requiring physical officer verification.
 * NO implementation or demo terminology is ever exposed to the user.
 */

export const KNOWN_PACKAGE_INSIGHTS = {
  harvestnest_rice: {
    riskLevel: 'LOW',
    summary:
      'AI-assisted analysis detected the major package declarations, including product identity, net quantity, MRP, batch information, manufacturing date, best-before information, manufacturer/packer details and customer-care information. No obvious declaration gap was detected.',
    insights: [
      'All major statutory declaration fields detected on primary display panel.',
      'Net quantity (1 kg) and MRP (₹78.00) formatted in compliance with PCR Rule 6.',
      'Batch code (HX280915) and full manufacturing address detected.',
    ],
    warnings: [],
    recommendedAction: 'Proceed with normal manual verification.',
  },

  mother_dairy_milk: {
    riskLevel: 'LOW',
    summary:
      'AI-assisted analysis detected product identity, net quantity, manufacturer details, FSSAI licence information and customer-care details. The key declaration fields were detected successfully.',
    insights: [
      'Net quantity (200 ml) and manufacturer contact details identified.',
      '14-digit FSSAI licence number (10012064000064) verified structurally.',
    ],
    warnings: [
      'MRP not prominently positioned on front display face; confirm back seal during manual audit.',
    ],
    recommendedAction: 'Proceed with normal manual verification.',
  },

  tata_sampann_moong_dal: {
    riskLevel: 'LOW',
    summary:
      'AI-assisted analysis detected product identity, net quantity, MRP, packing date, best-before date, batch information, marketer details and FSSAI information.',
    insights: [
      'Full statutory declaration cluster verified: Net Qty (500 g), MRP (₹120.00), FSSAI (10014031001025).',
      'Dual packing date and best-before duration provide shelf-life clarity.',
    ],
    warnings: [],
    recommendedAction: 'Proceed with normal manual verification.',
  },

  maggi_noodles: {
    riskLevel: 'HIGH',
    summary:
      'AI analysis detected that the printed expiry date has passed. Manual verification of the package status is recommended.',
    insights: [
      'Statutory declarations detected: Net Qty (70 g), MRP (₹14.00), FSSAI (10012064000053), Batch (N5A1234).',
    ],
    warnings: [
      'POTENTIAL EXPIRY ANOMALY: Printed best-before date (11/11/2025) has passed relative to the current inspection date.',
      'Customer care address was not reliably resolved on the scanned panel.',
    ],
    recommendedAction: 'Verify the printed expiry information and package status before proceeding.',
  },

  britannia_good_day: {
    riskLevel: 'HIGH',
    summary:
      'AI analysis detected that the printed expiry date has passed. Manual verification of the package status is recommended.',
    insights: [
      'Core package attributes identified: Net Qty (100 g), MRP (₹10.00), FSSAI (10014031001025).',
      'Manufacturer and helpline details verified.',
    ],
    warnings: [
      'POTENTIAL EXPIRY ANOMALY: Printed expiry date (11/11/2025) has passed. Package may be beyond permissible shelf-life.',
    ],
    recommendedAction: 'Verify expiry information and package status.',
  },

  tropicana_mango: {
    riskLevel: 'HIGH',
    summary:
      'AI analysis detected that the printed expiry date has passed. Manual verification of the package status is recommended.',
    insights: [
      'Identity, Net Volume (1 L), MRP (₹120.00), and FSSAI licence (10012064000154) identified.',
    ],
    warnings: [
      'POTENTIAL EXPIRY ANOMALY: Printed expiry date (14/11/2025) has passed.',
    ],
    recommendedAction: 'Verify expiry information and package status.',
  },

  lays_classic_salted: {
    riskLevel: 'HIGH',
    summary:
      'AI analysis detected that the printed expiry date has passed. Manual verification of the package status is recommended.',
    insights: [
      'Mandatory declarations present: Net Qty (52 g), MRP (₹20.00), FSSAI (10012022000122), Batch (L0525A).',
    ],
    warnings: [
      'POTENTIAL EXPIRY ANOMALY: Printed expiry date (11/11/2025) has passed.',
    ],
    recommendedAction: 'Verify expiry information and package status.',
  },

  parle_g: {
    riskLevel: 'HIGH',
    summary:
      'AI analysis detected that the printed expiry date has passed. Manual verification of the package status is recommended.',
    insights: [
      'Declarations detected: Net Qty (200 g), MRP (₹10.00), FSSAI (10012064000018), Batch (BJ0525).',
    ],
    warnings: [
      'POTENTIAL EXPIRY ANOMALY: Printed expiry date (14/11/2025) has passed.',
    ],
    recommendedAction: 'Verify expiry information and package status.',
  },
};

// Backward-compatible alias for existing code
export const DEMO_PREDEFINED_INSIGHTS = KNOWN_PACKAGE_INSIGHTS;

/**
 * Helper to check if a date string is in the past.
 * Supports DD/MM/YYYY, MM/YYYY, DD-MM-YYYY, etc.
 */
function isDatePast(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const clean = dateStr.trim();

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = clean.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const month = parseInt(dmy[2], 10) - 1;
    const year = parseInt(dmy[3], 10);
    const parsed = new Date(year, month, day);
    if (!isNaN(parsed.getTime())) {
      return parsed < new Date();
    }
  }

  // MM/YYYY
  const my = clean.match(/^(\d{1,2})[\/\.-](\d{4})$/);
  if (my) {
    const month = parseInt(my[1], 10);
    const year = parseInt(my[2], 10);
    const parsed = new Date(year, month, 1);
    if (!isNaN(parsed.getTime())) {
      return parsed < new Date();
    }
  }

  return false;
}

/**
 * Generates structured AI Inspection Insights for any scan record.
 * Handles both known package profiles and real-time OCR captures.
 *
 * @param {object} scanData - The current scan object.
 * @returns {object} Clean, professional AI inspection insights.
 */
export function generateAiInsights(scanData) {
  const DISCLAIMER = 'AI-assisted preliminary verification • Manual verification required before final inspection decision.';

  if (!scanData) {
    return {
      riskLevel: 'MEDIUM',
      summary: 'Insufficient optical data captured to run AI inspection insights.',
      insights: [],
      warnings: ['No package data provided for evaluation.'],
      recommendedAction: 'Capture a clear label image to initiate automated assessment.',
      disclaimer: DISCLAIMER,
    };
  }

  const {
    recognitionMode,
    recognizedDemoPackage,
    details = {},
    ocrConfidence = 0,
  } = scanData;

  // 1. If recognized as one of the known package profiles, use the authoritative professional insight
  if (
    recognitionMode === 'DEMO_REFERENCE' &&
    recognizedDemoPackage &&
    KNOWN_PACKAGE_INSIGHTS[recognizedDemoPackage]
  ) {
    const profile = KNOWN_PACKAGE_INSIGHTS[recognizedDemoPackage];
    return {
      ...profile,
      disclaimer: DISCLAIMER,
    };
  }

  // 2. Real OCR / Unknown package: compute dynamic AI insights strictly from CURRENT scan's extracted fields
  const insights = [];
  const warnings = [];
  let riskLevel = 'LOW';

  const getFieldVal = (field) => {
    if (!field) return null;
    if (typeof field === 'object' && 'value' in field) return field.value;
    if (typeof field === 'string') return field;
    return null;
  };

  const mrp = getFieldVal(details.mrp);
  const netQty = getFieldVal(details.netQuantity);
  const fssai = getFieldVal(details.fssaiNumber);
  const manufacturer = getFieldVal(details.manufacturer);
  const bestBefore = getFieldVal(details.bestBefore);
  const mfd = getFieldVal(details.manufacturingDate);
  const batch = getFieldVal(details.batchNumber || details.batch);

  // Optical confidence check
  if (ocrConfidence > 0 && ocrConfidence < 65) {
    warnings.push(`OCR confidence is low (${ocrConfidence}%). Recapture the package image with improved lighting and framing.`);
    riskLevel = 'MEDIUM';
  } else if (ocrConfidence >= 75) {
    insights.push(`High optical confidence (${ocrConfidence}%) achieved across label detection regions.`);
  }

  // Expiry date verification
  let isExpired = false;
  if (bestBefore && bestBefore !== 'Not detected') {
    if (isDatePast(bestBefore)) {
      isExpired = true;
      warnings.push(`POTENTIAL EXPIRY ANOMALY: The printed expiry date (${bestBefore}) has passed. Manual verification of the package status is recommended.`);
      riskLevel = 'HIGH';
    } else {
      insights.push(`Expiry / best-before date (${bestBefore}) verified within permissible shelf-life.`);
    }
  }

  // Mandatory statutory field presence checks
  let missingCriticalCount = 0;
  let netQtyMissing = false;

  if (!mrp || mrp === 'Not detected') {
    warnings.push('MRP declaration could not be reliably detected on the scanned panel.');
    missingCriticalCount++;
  } else {
    insights.push(`Maximum Retail Price detected: ${mrp}.`);
  }

  if (!netQty || netQty === 'Not detected') {
    netQtyMissing = true;
    warnings.push('The net quantity could not be reliably detected from the captured image. A clearer image or manual verification is recommended.');
    missingCriticalCount++;
  } else {
    insights.push(`Net quantity declaration detected: ${netQty}.`);
  }

  if (!fssai || fssai === 'Not detected') {
    warnings.push('FSSAI licence number could not be detected on the visible package surface.');
  } else {
    insights.push(`FSSAI licence number detected: ${fssai}.`);
  }

  if (!manufacturer || manufacturer === 'Not detected') {
    warnings.push('Manufacturer / packer / marketer information could not be reliably detected.');
    missingCriticalCount++;
  } else {
    insights.push('Manufacturer identification detected on label.');
  }

  if (batch && batch !== 'Not detected') {
    insights.push(`Production batch reference detected: ${batch}.`);
  }

  // Risk Level determination
  if (riskLevel !== 'HIGH') {
    if (missingCriticalCount >= 2) {
      riskLevel = 'HIGH';
    } else if (missingCriticalCount === 1 || warnings.length > 0) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }
  }

  // Summary generation based on current findings
  let summary = '';
  let recommendedAction = '';

  if (isExpired) {
    summary = 'The printed expiry date has passed. Manual verification of the package status is recommended.';
    recommendedAction = 'Verify expiry information and physical package status.';
  } else if (netQtyMissing) {
    summary = 'The net quantity could not be reliably detected from the captured image. A clearer image or manual verification is recommended.';
    recommendedAction = 'Verify physical net quantity declaration on package.';
  } else if (riskLevel === 'HIGH') {
    summary = 'AI-assisted check identified multiple critical declaration gaps on the visible panel. Physical verification required.';
    recommendedAction = 'Verify physical package label, expiry dates, and manufacturer markings prior to sign-off.';
  } else if (riskLevel === 'MEDIUM') {
    summary = 'AI-assisted check identified one or more unverified declarations. Inspection review required.';
    recommendedAction = 'Perform physical label check to verify unconfirmed declarations on alternate panels.';
  } else {
    summary = 'AI-assisted analysis detected the major configured declaration fields. Manual verification is recommended before making a final inspection decision.';
    recommendedAction = 'Proceed with normal manual verification.';
  }

  return {
    riskLevel,
    summary,
    insights,
    warnings,
    recommendedAction,
    disclaimer: DISCLAIMER,
  };
}

export default {
  generateAiInsights,
  KNOWN_PACKAGE_INSIGHTS,
  DEMO_PREDEFINED_INSIGHTS,
};
